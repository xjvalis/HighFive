import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import FeedList from '@/components/events/FeedList';
import EventFilter from '@/components/events/EventFilter';
import LocationPicker from '@/components/events/LocationPicker';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Map, List, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PremiumModal from '@/components/premium/PremiumModal';
import { lazy, Suspense } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { getCurrentPosition } from '@/lib/nativeGeolocation';
const EventMap = lazy(() => import('@/components/events/EventMap'));

const PAGE_SIZE = 15;

function haversineKm(lat1,lng1,lat2,lng2){const R=6371;const dLat=(lat2-lat1)*Math.PI/180;const dLng=(lng2-lng1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}

export default function Home() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile, updateProfile, loading: profileLoading } = useCurrentUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(() => sessionStorage.getItem('hf_premium_banner_dismissed') === '1');
  const [sort, setSort] = useState('forYou');
  const [filters, setFilters] = useState({ date: '', location: '', maxPeople: '', paid: '' });
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(20);
  const [feedStats, setFeedStats] = useState({ todayCount: 0, activePeople: 0, newToday: 0, firstTimers: 0 });
  const favRef = useRef(new Set());
  const bottomRef = useRef(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get('category');

  usePageMeta({ title: activeCategory ? `${activeCategory} | HighFive` : 'HighFive', description: lang === 'cs' ? 'Najdi lidi pro společné aktivity.' : 'Find people for shared activities.' });

  useEffect(() => {
    getCurrentPosition().then(setUserLocation).catch(() => {});
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
        const [{ count: todayCount }, { count: newToday }, { data: todayEvents }, { count: firstTimers }] = await Promise.all([
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_approved', true).gte('date', todayStart).lt('date', todayEnd),
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_approved', true).gte('created_at', todayStart),
          supabase.from('events').select('participants').eq('is_approved', true).gte('date', todayStart).lt('date', todayEnd),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7*24*60*60*1000).toISOString()),
        ]);
        const participantSet = new Set();
        (todayEvents || []).forEach(e => (e.participants || []).forEach(p => participantSet.add(p)));
        setFeedStats({ todayCount: todayCount || 0, activePeople: participantSet.size || 0, newToday: newToday || 0, firstTimers: firstTimers || 0 });
      } catch {
        // Stats are non-critical; fail silently without disrupting the feed
      }
    };
    loadStats();
  }, []);

  const buildQuery = useCallback((offset = 0) => {
    const nowIso = new Date().toISOString();
    let q;
    if (sort === 'rightNow') {
      q = supabase.from('events').select('*').eq('is_approved', true).lte('date', nowIso).order('date', { ascending: true });
    } else if (sort === 'upcoming') {
      q = supabase.from('events').select('*').eq('is_approved', true).gt('date', nowIso).order('date', { ascending: true });
    } else if (sort === 'popular') {
      q = supabase.from('events').select('*').eq('is_approved', true).gt('date', nowIso).order('favorites_count', { ascending: false });
    } else if (sort === 'new') {
      q = supabase.from('events').select('*').eq('is_approved', true).gt('date', nowIso).order('created_at', { ascending: false });
    } else {
      q = supabase.from('events').select('*').eq('is_approved', true).gt('date', nowIso).order('date', { ascending: true });
    }
    if (activeCategory) q = q.eq('category', activeCategory);
    if (filters.location) q = q.ilike('location', `%${filters.location}%`);
    if (filters.date) { const d = new Date(filters.date); q = q.gte('date', d.toISOString().split('T')[0]).lt('date', new Date(d.getTime()+86400000).toISOString().split('T')[0]); }
    if (filters.maxPeople) q = q.lte('max_capacity', Number(filters.maxPeople));
    return q.range(offset, offset + PAGE_SIZE - 1);
  }, [sort, activeCategory, filters]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setPage(0);
    setHasMore(true);
    try {
      const { data, error } = await buildQuery(0);
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se načíst události.' : 'Failed to load events.'); return; }
      setEvents(data || []);
      setHasMore((data || []).length === PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const refreshing = usePullToRefresh(loadEvents);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data, error } = await buildQuery(nextPage * PAGE_SIZE);
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se načíst další události.' : 'Failed to load more events.'); return; }
      setEvents(prev => [...prev, ...(data || [])]);
      setHasMore((data || []).length === PAGE_SIZE);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, buildQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore();
    }, { threshold: 0.1 });
    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  const filteredEvents = useMemo(() => {
    let evts = userLocation ? events.filter(e => !e.latitude || !e.longitude || haversineKm(userLocation.lat, userLocation.lng, e.latitude, e.longitude) <= radius) : events;
    if (sort === 'rightNow') {
      const now = new Date();
      evts = evts.filter(e => { const end = e.end_time ? new Date(e.end_time) : new Date(new Date(e.date).getTime() + 2*60*60*1000); return now <= end; });
    }
    if (sort === 'forYou' && profile?.favorite_categories?.length) {
      const favCats = new Set(profile.favorite_categories);
      evts = [...evts].sort((a, b) => {
        const aF = favCats.has(a.category) ? 0 : 1;
        const bF = favCats.has(b.category) ? 0 : 1;
        if (aF !== bF) return aF - bF;
        return 0;
      });
    }
    return evts;
     
  }, [events, sort, radius, userLocation]);

  const mapEvents = events.filter(e => e.latitude && e.longitude && (!userLocation || haversineKm(userLocation.lat, userLocation.lng, e.latitude, e.longitude) <= radius));
  const profileWithCategories = useMemo(() => {
    if (!profile) return profile;
    return { ...profile, joined_categories: [...new Set(events.filter(e => e.participants?.includes(user?.email)).map(e => e.category).filter(Boolean))] };
     
  }, [profile?.id, events.length]);

  const handleJoin = async (event) => {
    if (!user) { toast.info(lang === 'cs' ? 'Přihlas se pro přidání na event.' : 'Sign in to join events.'); return; }
    const isJoined = event.participants?.includes(user.email);
    const isOnWaitlist = event.waitlist?.includes(user.email);
    const isFull = event.max_capacity && (event.participants?.length || 0) >= event.max_capacity;
    if (!isJoined && !isOnWaitlist) {
      const isPremium = profile?.is_premium || ['plus','creator'].includes(profile?.subscription_plan);
      if (!isPremium) {
        const now = new Date(); const reset = profile?.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
        const isNew = !reset || now.getFullYear()>reset.getFullYear() || now.getMonth()>reset.getMonth();
        if ((isNew ? 0 : profile?.monthly_join_count||0) >= 3) { setShowPremium(true); return; }
      }
    }
    const action = isJoined ? 'leave' : isOnWaitlist ? 'leave_waitlist' : isFull ? 'join_waitlist' : 'join';
    const { data, error } = await supabase.functions.invoke('join-event', { body: { event_id: event.id, action } });
    if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se změnit účast.' : 'Failed to update attendance.'); return data; }
    if (data?.event) setEvents(prev => prev.map(e => e.id === event.id ? data.event : e));
    return data;
  };

  const handleFavorite = async (event) => {
    if (favRef.current.has(event.id)) return;
    favRef.current.add(event.id);
    try {
      if (!user || !profile) return;
      const isFav = (profile.favorited_events||[]).includes(event.id);
      const updated = isFav ? (profile.favorited_events||[]).filter(i=>i!==event.id) : [...(profile.favorited_events||[]),event.id];
      await updateProfile({ favorited_events: updated });
      supabase.from('events').update({ favorites_count: Math.max(0,(event.favorites_count||0)+(isFav?-1:1)) }).eq('id',event.id)
        .then(({ error }) => { if (error) toast.error(lang === 'cs' ? 'Nepodařilo se aktualizovat počet oblíbených.' : 'Failed to update favorite count.'); });
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se uložit oblíbenou položku.' : 'Failed to update favorite.');
    } finally { favRef.current.delete(event.id); }
  };

  const SORT_TABS = [
    { value: 'forYou', label: tr.sortForYou },
    { value: 'popular', label: tr.sortPopular },
    { value: 'new', label: tr.sortNew },
    { value: 'upcoming', label: tr.sortUpcoming },
    { value: 'rightNow', label: tr.sortRightNow || 'Právě teď' },
  ];

  const renderFeed = () => {
    if (loading) return (
      <div className="space-y-2">
        {[1,2,3].map(i => (
          <div key={i} className="bg-card rounded-2xl p-3 border border-border/60">
            <Skeleton className="h-3 w-20 mb-2"/><Skeleton className="h-4 w-3/4 mb-1.5"/><Skeleton className="h-3 w-full mb-1"/><Skeleton className="h-3 w-1/2"/>
          </div>
        ))}
      </div>
    );
    if (sort === 'rightNow' && filteredEvents.length === 0) return (
      <div className="text-center py-10">
        <p className="text-3xl mb-2">🔴</p>
        <p className="font-grotesk font-semibold text-sm">{tr.sortRightNow || 'Právě teď'}</p>
        <p className="text-xs text-muted-foreground mt-1">{lang === 'cs' ? 'Právě teď neprobíhají žádné akce.' : 'No events happening right now.'}</p>
      </div>
    );
    if (filteredEvents.length === 0) return (
      <div className="text-center py-10">
        <p className="text-3xl mb-2">🙌</p>
        <p className="font-grotesk font-semibold text-sm">{tr.noEventsYet}</p>
        <p className="text-xs text-muted-foreground mt-1">{tr.noEventsFirstPost}</p>
      </div>
    );
    return (
      <>
        <FeedList events={filteredEvents} user={user} profile={profileWithCategories} onJoin={handleJoin} onFavorite={handleFavorite} isPersonalized={sort==='forYou'} feedStats={feedStats}/>
        <div ref={bottomRef} className="h-4"/>
        {loadingMore && <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground"/></div>}
        {!hasMore && filteredEvents.length >= PAGE_SIZE && <p className="text-center text-xs text-muted-foreground py-3">{lang === 'cs' ? 'Zobrazeny všechny události' : 'All events loaded'}</p>}
      </>
    );
  };

  return (
    <div className="pt-2">
      {refreshing && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
        </div>
      )}

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <h1 className="font-grotesk font-bold text-base sm:text-xl">{activeCategory || tr.whatsHappening}</h1>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-secondary rounded-lg p-0.5">
              <button onClick={()=>setShowMap(false)} style={{height:'28px'}} className={cn('flex items-center gap-1 px-2.5 rounded-md text-xs font-medium transition-all',!showMap?'bg-card shadow-sm':'text-muted-foreground')}><List className="w-3 h-3"/>{tr.viewList}</button>
              <button onClick={()=>setShowMap(true)} style={{height:'28px'}} className={cn('flex items-center gap-1 px-2.5 rounded-md text-xs font-medium transition-all',showMap?'bg-card shadow-sm':'text-muted-foreground')}><Map className="w-3 h-3"/>{tr.viewMap}</button>
            </div>
            <EventFilter filters={filters} onChange={setFilters}/>
          </div>
        </div>
        {!showMap && (
          <div className="flex gap-0.5 bg-secondary/80 rounded-lg p-0.5 overflow-x-auto no-scrollbar">
            {SORT_TABS.map(opt => (
              <button key={opt.value} onClick={() => { setSort(opt.value); setEvents([]); }} style={{height:'28px'}} className={cn('flex-shrink-0 flex items-center px-2.5 rounded-md text-xs font-medium transition-all', sort === opt.value ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
                {opt.value === 'rightNow' ? (
                  <span className="flex items-center gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full bg-rose-500 inline-block", sort === 'rightNow' && "animate-pulse")}></span>
                    {opt.label}
                  </span>
                ) : opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!profileLoading && profile && !profile.is_premium && profile.subscription_plan !== 'plus' && profile.subscription_plan !== 'creator' && !premiumBannerDismissed && (() => {
        const now=new Date(); const reset=profile.monthly_reset_date?new Date(profile.monthly_reset_date):null;
        const isNew=!reset||now.getFullYear()>reset.getFullYear()||now.getMonth()>reset.getMonth();
        const used=isNew?0:profile.monthly_join_count||0; const remaining=3-used;
        return (
          <div className="mb-2 flex items-center justify-between gap-2 bg-violet-50/50 border border-violet-200/60 rounded-xl px-3 py-2">
            <button className="flex-1 text-left" onClick={()=>setShowPremium(true)}>
              <span className="text-xs font-medium text-violet-700">
                {lang === 'cs'
                  ? (remaining<=0?'Vyčerpal/a jsi limit 3 přihlášení · Upgraduj na Plus →':remaining<=1?`Zbývá ${remaining} ze 3 přihlášení · Upgraduj →`:'Získej neomezené přihlašování - Plus od 100 Kč/měs')
                  : (remaining<=0?"You've used your 3 free joins this month · Upgrade to Plus →":remaining<=1?`${remaining} of 3 joins left · Upgrade →`:'Get unlimited joins - Plus from 100 Kč/mo')}
              </span>
            </button>
            <button onClick={()=>{setPremiumBannerDismissed(true);sessionStorage.setItem('hf_premium_banner_dismissed','1');}} className="text-muted-foreground p-0.5"><X className="w-3 h-3"/></button>
          </div>
        );
      })()}

      <div className="mb-2"><LocationPicker userLocation={userLocation} radius={radius} onLocationChange={setUserLocation} onRadiusChange={setRadius}/></div>

      {showMap ? (
        <div>
          <Suspense fallback={<div className="w-full h-[400px] rounded-2xl bg-secondary animate-pulse flex items-center justify-center"><span className="text-muted-foreground text-sm">{tr.mapLoading}</span></div>}>
            <EventMap events={mapEvents} userLocation={userLocation} radius={radius}/>
          </Suspense>
          {mapEvents.length === 0 && !loading && <p className="text-center text-sm text-muted-foreground mt-4">{tr.mapNoCoords}</p>}
        </div>
      ) : renderFeed()}

      <PremiumModal open={showPremium} onClose={()=>setShowPremium(false)} profile={profile} onUpgrade={u=>updateProfile(u)}/>
    </div>
  );
}

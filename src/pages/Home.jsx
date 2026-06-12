import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Map, List, X } from 'lucide-react';
import { toast } from 'sonner';
import PremiumModal from '@/components/premium/PremiumModal';
import { lazy, Suspense } from 'react';
const EventMap = lazy(() => import('@/components/events/EventMap'));

function haversineKm(lat1,lng1,lat2,lng2){const R=6371;const dLat=(lat2-lat1)*Math.PI/180;const dLng=(lng2-lng1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}

export default function Home() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile, updateProfile, loading: profileLoading } = useCurrentUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPremium, setShowPremium] = useState(false);
  const [premiumBannerDismissed, setPremiumBannerDismissed] = useState(() => sessionStorage.getItem('hf_premium_banner_dismissed') === '1');
  const [sort, setSort] = useState('forYou');
  const [filters, setFilters] = useState({ date: '', location: '', maxPeople: '', paid: '' });
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(20);
  const favRef = useRef(new Set());
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeCategory = params.get('category');

  usePageMeta({ title: activeCategory ? `${activeCategory} | HighFive` : 'HighFive', description: 'Najdi lidi pro společné aktivity.' });

  useEffect(() => {
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {});
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const nowTs = new Date();
    const nowIso = nowTs.toISOString();

    let q;
    if (sort === 'rightNow') {
      // Events happening right now: started but not ended
      q = supabase.from('events').select('*').eq('is_approved', true)
        .lte('date', nowIso)
        .order('date', { ascending: true })
        .limit(50);
    } else if (sort === 'upcoming') {
      // Future events sorted by date ascending, no personalization
      q = supabase.from('events').select('*').eq('is_approved', true)
        .gt('date', nowIso)
        .order('date', { ascending: true })
        .limit(100);
    } else if (sort === 'popular') {
      q = supabase.from('events').select('*').eq('is_approved', true)
        .gt('date', nowIso)
        .order('favorites_count', { ascending: false })
        .limit(100);
    } else if (sort === 'new') {
      q = supabase.from('events').select('*').eq('is_approved', true)
        .gt('date', nowIso)
        .order('created_at', { ascending: false })
        .limit(100);
    } else {
      // forYou - future events only
      q = supabase.from('events').select('*').eq('is_approved', true)
        .gt('date', nowIso)
        .order('date', { ascending: true })
        .limit(100);
    }
    if (activeCategory) q = q.eq('category', activeCategory);
    if (filters.location) q = q.ilike('location', `%${filters.location}%`);
    if (filters.date) { const d = new Date(filters.date); q = q.gte('date', d.toISOString().split('T')[0]).lt('date', new Date(d.getTime()+86400000).toISOString().split('T')[0]); }
    if (filters.maxPeople) q = q.lte('max_capacity', Number(filters.maxPeople));
    const { data } = await q;
    setEvents(data || []);
    setLoading(false);
  }, [sort, activeCategory, filters, userLocation?.lat, userLocation?.lng]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = (() => {
    let evts = userLocation ? events.filter(e => !e.latitude || !e.longitude || haversineKm(userLocation.lat, userLocation.lng, e.latitude, e.longitude) <= radius) : events;

    if (sort === 'rightNow') {
      // Filter to only truly happening now (end_time not passed)
      const now = new Date();
      evts = evts.filter(e => {
        const end = e.end_time ? new Date(e.end_time) : new Date(new Date(e.date).getTime() + 2*60*60*1000);
        return now <= end;
      });
    }

    if (sort === 'forYou' && profile?.favorite_categories?.length) {
      // Sort: preferred categories first, then by date
      const favCats = new Set(profile.favorite_categories);
      evts = [...evts].sort((a, b) => {
        const aFav = favCats.has(a.category) ? 0 : 1;
        const bFav = favCats.has(b.category) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return new Date(a.date) - new Date(b.date);
      });
    }

    return evts;
  })();
  const mapEvents = events.filter(e => e.latitude && e.longitude && (!userLocation || haversineKm(userLocation.lat, userLocation.lng, e.latitude, e.longitude) <= radius));

  const profileWithCategories = profile ? { ...profile, joined_categories: [...new Set(events.filter(e => e.participants?.includes(user?.email)).map(e => e.category).filter(Boolean))] } : profile;

  const handleJoin = async (event) => {
    if (!user) { toast.info('Přihlas se pro přidání na event.'); return; }
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
    if (!error && data?.event) setEvents(prev => prev.map(e => e.id === event.id ? data.event : e));
  };

  const handleFavorite = async (event) => {
    if (favRef.current.has(event.id)) return;
    favRef.current.add(event.id);
    try {
      if (!user || !profile) return;
      const isFav = (profile.favorited_events||[]).includes(event.id);
      const updated = isFav ? (profile.favorited_events||[]).filter(i=>i!==event.id) : [...(profile.favorited_events||[]),event.id];
      await updateProfile({ favorited_events: updated });
      supabase.from('events').update({ favorites_count: Math.max(0,(event.favorites_count||0)+(isFav?-1:1)) }).eq('id',event.id).then(()=>{});
    } finally { favRef.current.delete(event.id); }
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-grotesk font-bold text-lg sm:text-xl">{activeCategory || tr.whatsHappening}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-secondary rounded-xl p-0.5">
              <button onClick={()=>setShowMap(false)} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',!showMap?'bg-card shadow-sm':'text-muted-foreground')}><List className="w-3.5 h-3.5"/>{tr.viewList}</button>
              <button onClick={()=>setShowMap(true)} className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',showMap?'bg-card shadow-sm':'text-muted-foreground')}><Map className="w-3.5 h-3.5"/>{tr.viewMap}</button>
            </div>
            <EventFilter filters={filters} onChange={setFilters}/>
          </div>
        </div>
        {!showMap && <div className="flex gap-1 bg-secondary rounded-xl p-1 overflow-x-auto no-scrollbar">
          {[
            {value:'forYou', label: tr.sortForYou},
            {value:'upcoming', label: tr.sortUpcoming},
            {value:'rightNow', label: tr.sortRightNow || 'Právě teď'},
            {value:'popular', label: tr.sortPopular},
            {value:'new', label: tr.sortNew},
          ].map(opt=>(
            <button key={opt.value} onClick={()=>setSort(opt.value)} className={cn('flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',sort===opt.value?'bg-card shadow-sm':'text-muted-foreground')}>
              {opt.value === 'rightNow' && sort === 'rightNow' ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>{opt.label}</span> : opt.label}
            </button>
          ))}
        </div>}
      </div>

      {!profileLoading && profile && !profile.is_premium && profile.subscription_plan !== 'plus' && profile.subscription_plan !== 'creator' && !premiumBannerDismissed && (() => {
        const now=new Date(); const reset=profile.monthly_reset_date?new Date(profile.monthly_reset_date):null;
        const isNew=!reset||now.getFullYear()>reset.getFullYear()||now.getMonth()>reset.getMonth();
        const used=isNew?0:profile.monthly_join_count||0; const remaining=3-used;
        return (
          <div className="mb-4 flex items-center justify-between gap-2 bg-violet-50/50 border border-violet-200/60 rounded-2xl px-4 py-2.5">
            <button className="flex-1 text-left" onClick={()=>setShowPremium(true)}>
              <span className="text-sm font-medium text-violet-700">{remaining<=0?'Vyčerpal/a jsi limit 3 přihlášení · Upgraduj na Plus →':remaining<=1?`Zbývá ${remaining} ze 3 přihlášení · Upgraduj na Plus →`:'Získej neomezené přihlašování — Plus od 100 Kč/měs'}</span>
            </button>
            <button onClick={()=>{setPremiumBannerDismissed(true);sessionStorage.setItem('hf_premium_banner_dismissed','1');}} className="text-muted-foreground p-1"><X className="w-3.5 h-3.5"/></button>
          </div>
        );
      })()}

      {(showMap||userLocation) && <div className="mb-4"><LocationPicker userLocation={userLocation} radius={radius} onLocationChange={setUserLocation} onRadiusChange={setRadius}/></div>}

      {showMap ? (
        <div>
          <Suspense fallback={<div className="w-full h-[500px] rounded-2xl bg-secondary animate-pulse flex items-center justify-center"><span className="text-muted-foreground text-sm">{tr.mapLoading}</span></div>}>
            <EventMap events={mapEvents} userLocation={userLocation} radius={radius}/>
          </Suspense>
          {mapEvents.length===0&&!loading&&<p className="text-center text-sm text-muted-foreground mt-4">{tr.mapNoCoords}</p>}
        </div>
      ) : loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="bg-card rounded-2xl p-4 border border-border/60"><Skeleton className="h-4 w-24 mb-3"/><Skeleton className="h-5 w-3/4 mb-2"/><Skeleton className="h-4 w-full mb-1"/><Skeleton className="h-4 w-1/2"/></div>)}</div>
      ) : filteredEvents.length===0 ? (
        <div className="text-center py-16"><p className="text-4xl mb-3">🙌</p><p className="font-grotesk font-semibold">{tr.noEventsYet}</p><p className="text-sm text-muted-foreground mt-1">{tr.noEventsFirstPost}</p></div>
      ) : (
        {sort === 'rightNow' && filteredEvents.length === 0 && !loading ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔴</p>
            <p className="font-grotesk font-semibold">{tr.sortRightNow || 'Právě teď'}</p>
            <p className="text-sm text-muted-foreground mt-1">{lang === 'cs' ? 'Právě teď neprobíhají žádné akce.' : 'No events happening right now.'}</p>
          </div>
        ) : (
          <FeedList events={filteredEvents} user={user} profile={profileWithCategories} onJoin={handleJoin} onFavorite={handleFavorite} isPersonalized={sort==='forYou'}/>
        )}
      )}

      <PremiumModal open={showPremium} onClose={()=>setShowPremium(false)} profile={profile} onUpgrade={u=>updateProfile(u)}/>
    </div>
  );
}

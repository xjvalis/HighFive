import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import EmptyState from '@/components/ui/EmptyState';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { svPageTitle, svSubtitle, svCard } from '@/lib/svStyles';

// Same "is it over?" rule the rest of the app uses (MyEvents, Home's Right Now
// tab): an event ends at end_time, or 2h after it starts if none was set.
const endOf = (e) => e.end_time
  ? new Date(e.end_time)
  : new Date(new Date(e.date).getTime() + 2 * 60 * 60 * 1000);

// hot_score exists in the DB but is null on most rows, so rank on the signals
// the app actually maintains: people signed up, an active discussion, being
// favorited a lot, only a few spots left (scarcity — a near-full event reads
// as "in demand" far more than raw headcount does), and already underway.
const liveliness = (e, now) => {
  const capacity = e.max_capacity;
  const going = e.participants?.length || 0;
  const spotsLeft = capacity ? capacity - going : null;
  const almostFull = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 3;

  return going * 3
    + (e.comments_count || 0) * 2
    + (e.favorites_count || 0) * 2
    + (almostFull ? 8 : 0)
    + (new Date(e.date) <= now ? 5 : 0);
};

export default function Trending() {
  const tr = useT();
  const { user, profile, updateProfile } = useCurrentUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const favRef = useRef(new Set());

  useEffect(() => {
    // Events may run up to 24h (enforced in CreateEvent), so anything started
    // within the last 24h could still be going; endOf() decides precisely.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    supabase.from('events').select('*').eq('is_approved', true)
      .gt('date', cutoff).order('date', { ascending: true }).limit(100)
      .then(({ data, error }) => {
        if (error) toast.error(tr.trendingLoadFailed || 'Nepodařilo se načíst populární události.');
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  const trending = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter(e => endOf(e) > now)
      .sort((a, b) => liveliness(b, now) - liveliness(a, now) || new Date(a.date) - new Date(b.date))
      .slice(0, 30);
  }, [events]);

  const handleJoin = async (event) => {
    if (!user) return;
    const isJoined=event.participants?.includes(user.email);
    const action=isJoined?'leave':'join';
    const {data}=await supabase.functions.invoke('join-event',{body:{event_id:event.id,action}});
    if (data?.event) setEvents(prev=>prev.map(e=>e.id===event.id?data.event:e));
  };

  const handleFavorite = async (event) => {
    if (favRef.current.has(event.id)||!user||!profile) return;
    favRef.current.add(event.id);
    try {
      const isFav=(profile.favorited_events||[]).includes(event.id);
      const updated=isFav?(profile.favorited_events||[]).filter(id=>id!==event.id):[...(profile.favorited_events||[]),event.id];
      await updateProfile({favorited_events:updated});
    } finally { favRef.current.delete(event.id); }
  };

  return (
    <div className="pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <h1 style={{ ...svPageTitle, marginBottom: 4 }}>{tr.trendingTitle}</h1>
      <p style={{ ...svSubtitle, marginBottom: 18 }}>{tr.trendingSubtitle}</p>
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} style={{ ...svCard, padding: '12px 14px' }}>
              <div style={{ height: 10, width: 80, background: 'var(--sv-surface-muted)', borderRadius: 5, marginBottom: 10 }}/>
              <div style={{ height: 12, width: '70%', background: 'var(--sv-surface-muted)', borderRadius: 5, marginBottom: 8 }}/>
              <div style={{ height: 10, width: '45%', background: 'var(--sv-surface-muted)', borderRadius: 5 }}/>
            </div>
          ))}
        </div>
      ) : trending.length===0 ? (
        <EmptyState title={tr.nothingTrending} />
      ) : (
        <div className="space-y-2">
          {trending.map(e=><EventCard key={e.id} event={e} onJoin={handleJoin} onFavorite={handleFavorite} isJoined={!!(user&&e.participants?.includes(user.email))} isFavorited={!!(profile?.favorited_events?.includes(e.id))}/>)}
        </div>
      )}
    </div>
  );
}

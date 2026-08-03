import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';

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
    <div>
      <h1 className="font-grotesk font-bold text-xl mb-1">{tr.trendingTitle}</h1>
      <p className="text-sm text-muted-foreground mb-5">{tr.trendingSubtitle}</p>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="bg-card rounded-2xl p-4 border border-border/60"><Skeleton className="h-4 w-24 mb-3"/><Skeleton className="h-5 w-3/4 mb-2"/><Skeleton className="h-4 w-1/2"/></div>)}</div>
      ) : trending.length===0 ? (
        <div className="text-center py-16"><p className="text-4xl mb-3">🔥</p><p className="font-grotesk font-semibold">{tr.nothingTrending}</p></div>
      ) : (
        <div className="space-y-3">
          {trending.map(e=><EventCard key={e.id} event={e} onJoin={handleJoin} onFavorite={handleFavorite} isJoined={!!(user&&e.participants?.includes(user.email))} isFavorited={!!(profile?.favorited_events?.includes(e.id))}/>)}
        </div>
      )}
    </div>
  );
}

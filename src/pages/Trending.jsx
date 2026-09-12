import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import EmptyState from '@/components/ui/EmptyState';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { svPageTitle, svSubtitle, svCard } from '@/lib/svStyles';
import { isEventOver } from '@/lib/events';
import { sortByTrending } from '@/lib/trending';

export default function Trending() {
  const tr = useT();
  const { user, profile, updateProfile } = useCurrentUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const favRef = useRef(new Set());

  useEffect(() => {
    // Events may run up to 24h (enforced in CreateEvent), so anything started
    // within the last 24h could still be going; isEventOver() decides precisely.
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
    return sortByTrending((events || []).filter(e => !isEventOver(e, now)), now).slice(0, 30);
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

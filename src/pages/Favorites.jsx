import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';

export default function Favorites() {
  const tr = useT();
  const { user, profile, updateProfile, loading: userLoading } = useCurrentUser();
  if (!user && !userLoading) { navigate('/login'); return null; }
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const favRef = useRef(new Set());

  useEffect(() => {
    if (!profile) return;
    const ids = profile?.favorited_events || [];
    if (!ids.length) { setEvents([]); setLoading(false); return; }
    supabase.from('events').select('*').in('id', ids).order('date', {ascending:true})
      .then(({data}) => { setEvents(data||[]); setLoading(false); });
  }, [profile?.id]);

  const handleFavorite = async (event) => {
    if (favRef.current.has(event.id)) return;
    favRef.current.add(event.id);
    try {
      const updated = (profile.favorited_events||[]).filter(id=>id!==event.id);
      await updateProfile({ favorited_events: updated });
      setEvents(prev=>prev.filter(e=>e.id!==event.id));
    } finally { favRef.current.delete(event.id); }
  };

  const handleJoin = async (event) => {
    if (!user) return;
    const isJoined = event.participants?.includes(user.email);
    const isOnWaitlist = event.waitlist?.includes(user.email);
    const isFull = event.max_capacity&&(event.participants?.length||0)>=event.max_capacity;
    const action = isJoined?'leave':isOnWaitlist?'leave_waitlist':isFull?'join_waitlist':'join';
    const {data} = await supabase.functions.invoke('join-event',{body:{event_id:event.id,action}});
    if (data?.event) setEvents(prev=>prev.map(e=>e.id===event.id?data.event:e));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>;

  return (
    <div>
      <h1 className="font-grotesk font-bold text-xl mb-1">{tr.favoritesTitle}</h1>
      <p className="text-sm text-muted-foreground mb-5">{tr.favoritesSubtitle}</p>
      {events.length===0 ? (
        <div className="text-center py-16"><p className="text-4xl mb-3">⭐</p><p className="font-grotesk font-semibold">{tr.noFavorites}</p><p className="text-sm text-muted-foreground mt-1">{tr.noFavoritesHint}</p></div>
      ) : (
        <div className="space-y-4">
          {events.map(event=><EventCard key={event.id} event={event} onJoin={handleJoin} onFavorite={handleFavorite} isJoined={!!(user&&event.participants?.includes(user.email))} isFavorited={true}/>)}
        </div>
      )}
    </div>
  );
}

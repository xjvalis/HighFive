import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/lib/i18n';

export default function Trending() {
  const tr = useT();
  const { user, profile, updateProfile } = useCurrentUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const favRef = useRef(new Set());

  useEffect(() => {
    supabase.from('events').select('*').eq('is_approved',true).order('favorites_count',{ascending:false}).limit(30)
      .then(({data})=>{setEvents(data||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

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
      ) : events.length===0 ? (
        <div className="text-center py-16"><p className="text-4xl mb-3">🔥</p><p className="font-grotesk font-semibold">{tr.nothingTrending}</p></div>
      ) : (
        <div className="space-y-3">
          {events.map(e=><EventCard key={e.id} event={e} onJoin={handleJoin} onFavorite={handleFavorite} isJoined={!!(user&&e.participants?.includes(user.email))} isFavorited={!!(profile?.favorited_events?.includes(e.id))}/>)}
        </div>
      )}
    </div>
  );
}

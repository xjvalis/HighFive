import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import { useT } from '@/lib/i18n';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { toast } from 'sonner';
import { Star, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Favorites() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user, profile, updateProfile, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const favRef = useRef(new Set());

  useEffect(() => {
    if (!user && !userLoading) navigate('/login');
  }, [user, userLoading]);

  useEffect(() => {
    if (!profile) return;
    const ids = profile?.favorited_events || [];
    if (!ids.length) { setEvents([]); setLoading(false); return; }
    supabase.from('events').select('*').in('id', ids).order('date', { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(lang === 'cs' ? 'Nepodařilo se načíst oblíbené události.' : 'Failed to load favorite events.');
        setEvents(data || []); setLoading(false);
      });
  }, [profile?.id]);

  const handleFavorite = async (event) => {
    if (favRef.current.has(event.id)) return;
    favRef.current.add(event.id);
    try {
      const updated = (profile.favorited_events || []).filter(id => id !== event.id);
      await updateProfile({ favorited_events: updated });
      setEvents(prev => prev.filter(e => e.id !== event.id));
      toast.success(lang === 'cs' ? 'Odebráno z oblíbených' : 'Removed from favorites');
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se odebrat z oblíbených.' : 'Failed to remove from favorites.');
    } finally { favRef.current.delete(event.id); }
  };

  const handleJoin = async (event) => {
    if (!user) return;
    const isJoined = event.participants?.includes(user.email);
    const action = isJoined ? 'leave' : 'join';
    const { data, error } = await supabase.functions.invoke('join-event', { body: { event_id: event.id, action } });
    if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se změnit účast.' : 'Failed to update attendance.'); return; }
    if (data?.event) setEvents(prev => prev.map(e => e.id === event.id ? data.event : e));
  };

  // Split into upcoming and past
  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) > now);
  const past = events.filter(e => new Date(e.date) <= now);

  if (!user && !userLoading) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500"/>
          <h1 className="font-grotesk font-bold text-xl">{lang === 'cs' ? 'Moje oblíbené' : 'My favorites'}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {lang === 'cs'
            ? 'Akce, které chceš sledovat nebo se na ně chystáš. Hvězdičkou označíš akci a najdeš ji tady.'
            : 'Events you want to track or attend. Star an event and find it here.'}
        </p>
      </div>

      {/* Stats */}
      {events.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary flex-shrink-0"/>
            <div>
              <p className="font-grotesk font-bold text-lg">{upcoming.length}</p>
              <p className="text-xs text-muted-foreground">{lang === 'cs' ? 'Nadcházející' : 'Upcoming'}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0"/>
            <div>
              <p className="font-grotesk font-bold text-lg">{events.length}</p>
              <p className="text-xs text-muted-foreground">{lang === 'cs' ? 'Celkem uloženo' : 'Total saved'}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border/60">
              <Skeleton className="h-4 w-24 mb-3"/><Skeleton className="h-5 w-3/4 mb-2"/><Skeleton className="h-4 w-1/2"/>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">⭐</p>
          <p className="font-grotesk font-semibold mb-1">{lang === 'cs' ? 'Zatím žádné oblíbené' : 'No favorites yet'}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {lang === 'cs'
              ? 'Klikni na hvězdičku u libovolné akce a najdeš ji tady.'
              : 'Tap the star on any event and it will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {lang === 'cs' ? 'Nadcházející' : 'Upcoming'}
              </p>
              <div className="space-y-2.5">
                {upcoming.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onJoin={handleJoin}
                    onFavorite={handleFavorite}
                    isJoined={!!(user && event.participants?.includes(user.email))}
                    isFavorited={true}
                  />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {lang === 'cs' ? 'Proběhlé' : 'Past'}
              </p>
              <div className="space-y-2.5 opacity-60">
                {past.map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onJoin={handleJoin}
                    onFavorite={handleFavorite}
                    isJoined={!!(user && event.participants?.includes(user.email))}
                    isFavorited={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

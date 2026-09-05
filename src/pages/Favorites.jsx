import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import EmptyState from '@/components/ui/EmptyState';
import { useT } from '@/lib/i18n';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { toast } from 'sonner';
import { SvIcon } from '@/components/icons/SvIcon';
import { svPageTitle, svSubtitle, svCard, svSectionLabel } from '@/lib/svStyles';

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
    <div className="max-w-2xl mx-auto pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <SvIcon name="star" size={16} style={{ color: 'var(--sv-brand-orange)' }}/>
          <h1 style={svPageTitle}>{lang === 'cs' ? 'Moje oblíbené' : 'My favorites'}</h1>
        </div>
        <p style={svSubtitle}>
          {lang === 'cs'
            ? 'Akce, které chceš sledovat nebo se na ně chystáš. Hvězdičkou označíš akci a najdeš ji tady.'
            : 'Events you want to track or attend. Star an event and find it here.'}
        </p>
      </div>

      {/* Stats */}
      {events.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div style={{ ...svCard, padding: 14 }} className="flex items-center gap-3">
            <SvIcon name="calendar" size={16} style={{ color: 'var(--sv-meta)', flexShrink: 0 }}/>
            <div>
              <p style={{ font: "500 17px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{upcoming.length}</p>
              <p style={svSubtitle}>{lang === 'cs' ? 'Nadcházející' : 'Upcoming'}</p>
            </div>
          </div>
          <div style={{ ...svCard, padding: 14 }} className="flex items-center gap-3">
            <SvIcon name="star" size={16} style={{ color: 'var(--sv-brand-orange)', flexShrink: 0 }}/>
            <div>
              <p style={{ font: "500 17px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{events.length}</p>
              <p style={svSubtitle}>{lang === 'cs' ? 'Celkem uloženo' : 'Total saved'}</p>
            </div>
          </div>
        </div>
      )}

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
      ) : events.length === 0 ? (
        <EmptyState
          title={lang === 'cs' ? 'Zatím žádné oblíbené' : 'No favorites yet'}
          note={lang === 'cs' ? 'Klikni na hvězdičku u libovolné akce a najdeš ji tady.' : 'Tap the star on any event and it will appear here.'}
        />
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div>
              <p style={{ ...svSectionLabel, marginBottom: 9 }}>{lang === 'cs' ? 'Nadcházející' : 'Upcoming'}</p>
              <div className="space-y-2">
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
              <p style={{ ...svSectionLabel, marginBottom: 9 }}>{lang === 'cs' ? 'Proběhlé' : 'Past'}</p>
              <div className="space-y-2" style={{ opacity: 0.6 }}>
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

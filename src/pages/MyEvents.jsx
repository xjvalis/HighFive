import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import OrganizerEventCard from '@/components/myevents/OrganizerEventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import { Archive } from 'lucide-react';
import EventChat from '@/components/events/EventChat';
import { format } from 'date-fns';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';

function PastEventCard({ event }) {
  const { lang } = useContext(LanguageContext);
  const [chatOpen, setChatOpen] = useState(false);
  const cat = getCategoryStyle(event.category);

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden opacity-80">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', cat.color)}>
                {cat.emoji} {getCategoryLabel(event.category, lang)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                {lang === 'cs' ? 'Proběhlé' : 'Past'}
              </span>
            </div>
            <h3 className="font-grotesk font-semibold text-sm line-clamp-1">{event.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span>📍 {event.location}</span>
              <span>📅 {format(new Date(event.date), 'EEE d MMM · HH:mm')}</span>
              <span>👥 {event.participants?.length || 0}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setChatOpen(v => !v)}
          className="mt-2 text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          💬 {chatOpen ? (lang === 'cs' ? 'Skrýt chat' : 'Hide chat') : (lang === 'cs' ? 'Zobrazit chat' : 'Show chat')}
        </button>
      </div>
      {chatOpen && (
        <div className="border-t border-border/60">
          <EventChat event={event} user={null} profile={null} readOnly />
        </div>
      )}
    </div>
  );
}

export default function MyEvents() {
  const tr = useT();
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser();
  const [created, setCreated] = useState([]);
  const [joined, setJoined] = useState([]);
  const [pastJoined, setPastJoined] = useState([]);
  const [pastCreated, setPastCreated] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState('going');
  const [leaveConfirm, setLeaveConfirm] = useState(null);

  const now = new Date().toISOString();

  useEffect(() => {
    if (!user && !loading) navigate('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    const cutoff = new Date().toISOString(); // Events past their start time are candidates for archiving

    Promise.all([
      // Active created events
      supabase.from('events').select('*').eq('organizer_email', user.email).order('date', { ascending: false }),
      // Past created events
      Promise.resolve({ data: [] }), // past created handled client-side
      // Active joined events — anything the user is a participant of, including events they organize themselves
      supabase.from('events').select('*').contains('participants', [user.email]).order('date', { ascending: true }),
      // Past joined events
      Promise.resolve({ data: [] }), // past joined handled client-side
    ]).then(([{ data: allMine, error: mineError }, _unused1, { data: allJoined, error: joinedError }, _unused2]) => {
      if (mineError || joinedError) {
        toast.error('Nepodařilo se načíst tvé události.');
        setLoadingData(false);
        return;
      }
      const now = new Date();
      const isActive = (e) => {
        const end = e.end_time ? new Date(e.end_time) : new Date(new Date(e.date).getTime() + 2*60*60*1000);
        return end > now;
      };
      const allMyEvents = allMine || [];
      const allJoinedEvents = allJoined || [];
      setCreated(allMyEvents.filter(isActive));
      setPastCreated(allMyEvents.filter(e => !isActive(e)));
      setJoined(allJoinedEvents.filter(isActive));
      setPastJoined(allJoinedEvents.filter(e => !isActive(e)));
      setLoadingData(false);
    }).catch(() => {
      toast.error('Nepodařilo se načíst tvé události.');
      setLoadingData(false);
    });
  }, [user?.id]);

  const confirmLeave = async () => {
    const event = leaveConfirm;
    setLeaveConfirm(null);
    const { data } = await supabase.functions.invoke('join-event', { body: { event_id: event.id, action: 'leave' } });
    if (data?.event) {
      setJoined(prev => prev.filter(e => e.id !== event.id));
      toast.success(tr.attendanceCancelled || 'Účast zrušena.');
    } else {
      toast.error('Nepodařilo se zrušit účast.');
    }
  };

  const handleParticipantsChange = (eventId, newParticipants, newWaitlist) =>
    setCreated(prev => prev.map(e => e.id === eventId ? { ...e, participants: newParticipants, waitlist: newWaitlist } : e));

  const pastCombined = [...pastJoined, ...pastCreated.filter(e => !pastJoined.some(j => j.id === e.id))];
  const pastCount = pastCombined.length;

  const tabs = [
    { key: 'going', label: `${tr.attending} (${joined.length})` },
    { key: 'hosting', label: `${tr.hosting} (${created.length})` },
    { key: 'past', label: `${tr.pastEvents || 'Proběhlé'} (${pastCount})` },
  ];

  if (!user && !loading) return null;

  return (
    <div>
      <h1 className="font-grotesk font-bold text-xl mb-5">{tr.myEvents}</h1>
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-5 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t.key ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      <ConfirmDialog open={!!leaveConfirm} onConfirm={confirmLeave} onCancel={() => setLeaveConfirm(null)}
        title={tr.cancelAttendance || 'Zrušit účast?'}
        description={leaveConfirm ? `${tr.cancelAttendanceConfirm || 'Opravdu chceš zrušit účast na akci'} „${leaveConfirm.title}"?` : ''}
        confirmLabel={tr.cancelAttendanceBtn || 'Zrušit účast'} destructive />

      {loadingData ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border/60">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'going' && (
            <>
              {joined.map(e => <EventCard key={e.id} event={e} onJoin={() => setLeaveConfirm(e)} isJoined={true} />)}
              {joined.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🙌</p>
                  <p className="font-grotesk font-semibold">{tr.noAttendingEvents}</p>
                </div>
              )}
            </>
          )}

          {tab === 'hosting' && (
            <>
              {created.map(e => <OrganizerEventCard key={e.id} event={e} onParticipantsChange={handleParticipantsChange} />)}
              {created.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">📅</p>
                  <p className="font-grotesk font-semibold">{tr.noHostedEvents}</p>
                </div>
              )}
            </>
          )}

          {tab === 'past' && (
            <>
              {pastCount === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">🗓️</p>
                  <p className="font-grotesk font-semibold">{tr.pastEventsEmpty || 'Zatím žádné proběhlé akce'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{tr.pastEventsHint || 'Akce, kterých ses zúčastnil/a, se zobrazí zde po skončení'}</p>
                </div>
              ) : (
                <>
                  {(pastJoined.length > 0 || pastCreated.length > 0) && (
                    <div className="flex items-center gap-2 mb-3">
                      <Archive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {tr.pastEvents || 'Proběhlé akce'} · {pastCount}
                      </span>
                    </div>
                  )}
                  {pastCombined
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(e => <PastEventCard key={e.id} event={e} />)}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

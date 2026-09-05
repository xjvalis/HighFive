import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import OrganizerEventCard from '@/components/myevents/OrganizerEventCard';
import EmptyState from '@/components/ui/EmptyState';
import { useT } from '@/lib/i18n';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';
import EventChat from '@/components/events/EventChat';
import { format } from 'date-fns';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { SvIcon } from '@/components/icons/SvIcon';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { svPageTitle, svCard, svSectionLabel } from '@/lib/svStyles';

function PastEventCard({ event }) {
  const { lang } = useContext(LanguageContext);
  const [chatOpen, setChatOpen] = useState(false);
  const cat = getCategoryStyle(event.category);

  return (
    <div style={{ ...svCard, overflow: 'hidden', opacity: 0.75 }}>
      <div style={{ padding: '12px 14px' }}>
        <div className="flex items-center" style={{ gap: 5, marginBottom: 6 }}>
          <span className="flex items-center flex-shrink-0" style={{ gap: 5, background: cat.bg, color: cat.ink, borderRadius: 'var(--sv-r-pill)', padding: '3px 8px', font: "400 10px 'Outfit', sans-serif" }}>
            <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 10 }}>{cat.emoji}</span>
            {getCategoryLabel(event.category, lang)}
          </span>
          <span style={{ font: "400 10px 'Outfit', sans-serif", color: 'var(--sv-meta)', background: 'var(--sv-surface-muted)', borderRadius: 'var(--sv-r-pill)', padding: '3px 8px' }}>
            {lang === 'cs' ? 'Proběhlé' : 'Past'}
          </span>
        </div>
        <h3 className="line-clamp-1" style={{ font: "500 14.5px 'Outfit', sans-serif", letterSpacing: '-0.015em', color: 'var(--sv-ink)' }}>{event.title}</h3>
        <div className="flex items-center flex-wrap" style={{ marginTop: 5, gap: 12, font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
          <span className="flex items-center gap-1 truncate max-w-[160px]"><SvIcon name="pin" size={11} style={{ color: '#B4AEA6', flexShrink: 0 }}/> {event.location}</span>
          <span>{format(new Date(event.date), 'EEE d MMM · HH:mm')}</span>
          <span className="flex items-center gap-1"><SvIcon name="users" size={11} style={{ color: '#B4AEA6' }}/>{event.participants?.length || 0}</span>
        </div>
        <button onClick={() => setChatOpen(v => !v)} className="flex items-center gap-1" style={{ marginTop: 9, font: "400 11.5px 'Outfit', sans-serif", color: 'var(--sv-link)' }}>
          <SvIcon name="message" size={12}/>
          {chatOpen ? (lang === 'cs' ? 'Skrýt chat' : 'Hide chat') : (lang === 'cs' ? 'Zobrazit chat' : 'Show chat')}
        </button>
      </div>
      {chatOpen && (
        <div style={{ borderTop: '1px solid var(--sv-hairline)' }}>
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
    <div className="pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <h1 style={{ ...svPageTitle, marginBottom: 18 }}>{tr.myEvents}</h1>
      <div className="flex overflow-x-auto no-scrollbar" style={{ gap: 2, background: 'var(--sv-surface-muted)', borderRadius: 10, padding: 3, marginBottom: 18 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className="flex-shrink-0 transition-all"
            style={{ padding: '8px 16px', borderRadius: 8, font: `${tab === t.key ? 500 : 400} 12.5px 'Outfit', sans-serif`, background: tab === t.key ? 'var(--sv-surface)' : 'transparent', color: tab === t.key ? 'var(--sv-ink)' : 'var(--sv-meta)' }}>
            {t.label}
          </button>
        ))}
      </div>

      <ConfirmDialog open={!!leaveConfirm} onConfirm={confirmLeave} onCancel={() => setLeaveConfirm(null)}
        title={tr.cancelAttendance || 'Zrušit účast?'}
        description={leaveConfirm ? `${tr.cancelAttendanceConfirm || 'Opravdu chceš zrušit účast na akci'} „${leaveConfirm.title}"?` : ''}
        confirmLabel={tr.cancelAttendanceBtn || 'Zrušit účast'} destructive />

      {loadingData ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...svCard, padding: '12px 14px' }}>
              <div style={{ height: 10, width: 80, background: 'var(--sv-surface-muted)', borderRadius: 5, marginBottom: 10 }}/>
              <div style={{ height: 12, width: '70%', background: 'var(--sv-surface-muted)', borderRadius: 5, marginBottom: 8 }}/>
              <div style={{ height: 10, width: '45%', background: 'var(--sv-surface-muted)', borderRadius: 5 }}/>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tab === 'going' && (
            <>
              {joined.map(e => <EventCard key={e.id} event={e} onJoin={() => setLeaveConfirm(e)} isJoined={true} />)}
              {joined.length === 0 && <EmptyState title={tr.noAttendingEvents} />}
            </>
          )}

          {tab === 'hosting' && (
            <>
              {created.map(e => <OrganizerEventCard key={e.id} event={e} onParticipantsChange={handleParticipantsChange} />)}
              {created.length === 0 && <EmptyState title={tr.noHostedEvents} />}
            </>
          )}

          {tab === 'past' && (
            <>
              {pastCount === 0 ? (
                <EmptyState
                  title={tr.pastEventsEmpty || 'Zatím žádné proběhlé akce'}
                  note={tr.pastEventsHint || 'Akce, kterých ses zúčastnil/a, se zobrazí zde po skončení'}
                />
              ) : (
                <>
                  {(pastJoined.length > 0 || pastCreated.length > 0) && (
                    <div className="flex items-center gap-1.5" style={{ marginBottom: 9 }}>
                      <SvIcon name="calendar" size={12} style={{ color: 'var(--sv-meta)' }}/>
                      <span style={svSectionLabel}>{tr.pastEvents || 'Proběhlé akce'} · {pastCount}</span>
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

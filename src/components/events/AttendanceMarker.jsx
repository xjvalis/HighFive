import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { CheckCircle, UserCheck, UserX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';

export default function AttendanceMarker({ event, onMarked }) {
  const { user } = useCurrentUser();
  const { lang } = useContext(LanguageContext);
  const [loading, setLoading] = useState(false);
  const [marked, setMarked] = useState(event.attendance_marked || false);

  if (!user || event.organizer_email !== user.email) return null;

  // Only show after event has started
  const now = new Date();
  const eventDate = new Date(event.date);
  if (now < eventDate) return null;

  if (marked) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
        <CheckCircle className="w-4 h-4"/>
        {lang === 'cs' ? 'Účast označena' : 'Attendance marked'}
      </div>
    );
  }

  const participants = event.participants || [];

  const markAttendance = async (presentEmails) => {
    setLoading(true);
    try {
      // Mark event as attendance_marked
      await supabase.from('events').update({
        attendance_marked: true,
        attendees_present: presentEmails,
      }).eq('id', event.id);

      // Update reliability for no-shows
      const noShows = participants.filter(email => !presentEmails.includes(email));
      for (const email of noShows) {
        const { data: profile } = await supabase.from('user_profiles')
          .select('noshow_count, reliability_score, user_id')
          .eq('user_email', email)
          .maybeSingle();

        if (profile) {
          const newNoShow = (profile.noshow_count || 0) + 1;
          const newScore = Math.max(0, (profile.reliability_score || 100) - 15);

          await supabase.from('user_profiles').update({
            noshow_count: newNoShow,
            reliability_score: newScore,
          }).eq('user_email', email);

          // Send notification
          await supabase.from('notifications').insert({
            user_id: profile.user_id,
            user_email: email,
            type: 'noshow_warning',
            title: lang === 'cs' ? '⚠️ Nepřišel/a jsi na akci' : '⚠️ You missed an event',
            body: lang === 'cs'
              ? `Organizátor označil tvou neúčast na akci "${event.title}". Pokud se nemůžeš zúčastnit, odhlašuj se prosím předem ✌️`
              : `The organizer marked you as absent from "${event.title}". Please cancel in advance if you can't make it ✌️`,
            event_id: event.id,
            is_read: false,
          }).catch(() => {});
        }
      }

      setMarked(true);
      onMarked?.();
      toast.success(
        lang === 'cs'
          ? `Účast označena. ${noShows.length > 0 ? `${noShows.length} no-show(s) upozorněno.` : 'Všichni přišli! 🙌'}`
          : `Attendance marked. ${noShows.length > 0 ? `${noShows.length} no-show(s) notified.` : 'Everyone showed up! 🙌'}`
      );
    } catch (err) {
      toast.error(lang === 'cs' ? 'Chyba při označování' : 'Error marking attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AttendanceDialog
      participants={participants}
      lang={lang}
      loading={loading}
      onSubmit={markAttendance}
    />
  );
}

function AttendanceDialog({ participants, lang, loading, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(new Set(participants));

  const toggle = (email) => {
    const next = new Set(present);
    next.has(email) ? next.delete(email) : next.add(email);
    setPresent(next);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-medium bg-primary text-primary-foreground px-3 py-2 rounded-xl hover:bg-primary/90 transition-colors"
      >
        <UserCheck className="w-3.5 h-3.5"/>
        {lang === 'cs' ? 'Označit účast' : 'Mark attendance'}
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mt-3">
      <h3 className="font-grotesk font-semibold text-sm mb-3">
        {lang === 'cs' ? 'Kdo přišel?' : 'Who showed up?'}
      </h3>
      <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
        {participants.map(email => (
          <button key={email} onClick={() => toggle(email)}
            className={cn(
              'flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-colors',
              present.has(email) ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
            )}>
            <span className="truncate">{email}</span>
            {present.has(email)
              ? <UserCheck className="w-4 h-4 flex-shrink-0"/>
              : <UserX className="w-4 h-4 flex-shrink-0"/>
            }
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-xl border border-border text-sm">
          {lang === 'cs' ? 'Zrušit' : 'Cancel'}
        </button>
        <button
          onClick={() => onSubmit([...present])}
          disabled={loading}
          className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
          {lang === 'cs' ? 'Potvrdit' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

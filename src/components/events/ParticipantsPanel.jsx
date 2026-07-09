import { useState, useEffect, useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUp, UserX, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { LanguageContext } from '@/lib/language';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

// Single source of truth for waitlist promote/decline + participant removal,
// shared by EventDetail.jsx (organizer or viewer, opened from the avatar row)
// and OrganizerEventCard.jsx ("My Events" hosting tab).
export default function ParticipantsPanel({ event, isOrganizer, open, onClose, onEventUpdate }) {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user } = useCurrentUser();
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const participants = event?.participants || [];
  const waitlist = event?.waitlist || [];

  useEffect(() => {
    if (!open || participants.length === 0) return;
    supabase.from('user_profiles').select('user_email,display_name,avatar_url,reliability_score,noshow_count')
      .in('user_email', participants)
      .then(({ data, error }) => {
        if (error) return;
        const m = {}; (data || []).forEach(p => m[p.user_email] = p);
        setParticipantProfiles(m);
      });
  }, [open, event?.id]);

  const notifyUser = async (email, payload) => {
    const { data: up } = await supabase.from('user_profiles').select('user_id').eq('user_email', email).maybeSingle();
    if (up) await supabase.from('notifications').insert({ user_id: up.user_id, user_email: email, is_read: false, ...payload });
  };

  const handlePromote = async (email) => {
    setBusy(true);
    try {
      const newWaitlist = waitlist.filter(e => e !== email);
      const newParticipants = [...participants, email];
      const { data, error } = await supabase.from('events').update({ participants: newParticipants, waitlist: newWaitlist }).eq('id', event.id).select().single();
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se přesunout z čekačky.' : 'Failed to promote from waitlist.'); return; }
      onEventUpdate?.(data);
      await notifyUser(email, {
        type: 'waitlist_promoted',
        title: `🎉 Dostal/a ses na akci: ${event.title}`,
        body: lang === 'cs' ? 'Byl/a jsi přesunut/a z čekačky do účastníků.' : 'You were moved from the waitlist to participants.',
        event_id: event.id,
      });
      toast.success(tr.promotedToast?.(email) || `${email} přijat/a!`);
    } finally {
      setBusy(false);
    }
  };

  const handleDecline = async (email) => {
    setBusy(true);
    try {
      const newWaitlist = waitlist.filter(e => e !== email);
      const { data, error } = await supabase.from('events').update({ waitlist: newWaitlist }).eq('id', event.id).select().single();
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se odmítnout z čekačky.' : 'Failed to decline from waitlist.'); return; }
      onEventUpdate?.(data);
      await notifyUser(email, {
        type: 'event_updated',
        title: `😔 ${lang === 'cs' ? 'Nebyl/a jsi přijat/a na akci' : 'You were not accepted to the event'}: ${event.title}`,
        event_id: event.id,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (email) => {
    setRemoveConfirm(null);
    setBusy(true);
    try {
      const newParticipants = participants.filter(e => e !== email);
      const { data, error } = await supabase.from('events').update({ participants: newParticipants }).eq('id', event.id).select().single();
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se odebrat účastníka.' : 'Failed to remove participant.'); return; }
      onEventUpdate?.(data);
      const name = participantProfiles[email]?.display_name || email;
      await notifyUser(email, {
        type: 'event_updated',
        title: `😔 ${lang === 'cs' ? 'Byl/a jsi odebrán/a z akce' : 'You were removed from the event'}: ${event.title}`,
        event_id: event.id,
      });
      toast.success(tr.removedToast?.(name) || `${name} odebrán/a.`);
    } finally {
      setBusy(false);
    }
  };

  if (!event) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-grotesk">{tr.participants}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {waitlist.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{tr.waitlist} ({waitlist.length})</p>
                <div className="space-y-1.5">
                  {waitlist.map((email, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                      <span className="text-xs text-foreground/80 truncate">{email}</span>
                      {isOrganizer && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handlePromote(email)} disabled={busy} className="text-[11px] px-2 py-1 rounded-lg bg-mint text-emerald-700 font-medium hover:bg-emerald-100 flex items-center gap-1 disabled:opacity-50"><ArrowUp className="w-3 h-3"/>{tr.promote}</button>
                          <button onClick={() => handleDecline(email)} disabled={busy} className="text-[11px] px-2 py-1 rounded-lg bg-blush text-pink-700 font-medium hover:bg-red-100 disabled:opacity-50">✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{tr.participants} ({participants.length})</p>
              {participants.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tr.noParticipants}</p>
              ) : (
                <div className="space-y-1.5">
                  {participants.map(email => {
                    const p = participantProfiles[email];
                    const score = p?.reliability_score ?? 100;
                    const noShows = p?.noshow_count || 0;
                    const isSelf = email === user?.email;
                    return (
                      <div key={email} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold">
                            {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover"/> : <span>{(p?.display_name || email)[0]?.toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{p?.display_name || email}{isSelf ? ` (${lang === 'cs' ? 'ty' : 'you'})` : ''}</p>
                            {isOrganizer && (
                              <p className={cn('text-[10px] flex items-center gap-1', score < 70 ? 'text-red-500' : 'text-muted-foreground')}>
                                {score < 70 && <ShieldAlert className="w-2.5 h-2.5"/>}
                                {tr.reliabilityScore}: {score}/100{noShows > 0 ? ` · ${tr.noShowsCount(noShows)}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                        {isOrganizer && !isSelf && (
                          <button onClick={() => setRemoveConfirm(email)} disabled={busy} className="text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 flex items-center gap-1 flex-shrink-0 disabled:opacity-50">
                            <UserX className="w-3 h-3"/>{tr.removeParticipant}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeConfirm}
        onConfirm={() => handleRemove(removeConfirm)}
        onCancel={() => setRemoveConfirm(null)}
        title={tr.removeParticipantTitle}
        description={removeConfirm ? tr.removeParticipantConfirm(participantProfiles[removeConfirm]?.display_name || removeConfirm) : ''}
        confirmLabel={tr.removeParticipant}
        destructive
      />
    </>
  );
}

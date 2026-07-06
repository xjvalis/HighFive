import { useState, useEffect, useContext } from 'react';
import { format } from 'date-fns';
import { Users, Clock, MapPin, ChevronDown, ChevronUp, Mail, ArrowUp, ExternalLink, UserX, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { LanguageContext } from '@/lib/language';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';

export default function OrganizerEventCard({ event, onParticipantsChange }) {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const [emailLoading, setEmailLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [removing, setRemoving] = useState(false);

  const cat = getCategoryStyle(event.category);
  const participants = event.participants || [];
  const waitlist = event.waitlist || [];
  const isFull = event.max_capacity && participants.length >= event.max_capacity;

  useEffect(() => {
    if (!expanded || participants.length === 0) return;
    supabase.from('user_profiles').select('user_email,display_name,avatar_url,reliability_score,noshow_count')
      .in('user_email', participants)
      .then(({ data, error }) => {
        if (error) return;
        const m = {}; (data || []).forEach(p => m[p.user_email] = p);
        setParticipantProfiles(m);
      });
  }, [expanded, event.id]);

  const sendMessage = async () => {
    if (!emailMsg.trim()||participants.length===0||!user) return;
    setEmailLoading(true);
    try {
      for (const email of participants) {
        if (email===user.email) continue;
        const { error } = await supabase.from('direct_messages').insert({from_id:user.id,from_email:user.email,from_name:event.organizer_name||user.email,to_email:email,event_id:event.id,event_title:event.title,content:emailMsg.trim(),is_read:false});
        if (error) throw error;
      }
      setEmailMsg('');
      toast.success(tr.messageSentToAll?.(participants.length) || 'Zpráva odeslána všem účastníkům!');
    } catch {
      toast.error('Nepodařilo se odeslat zprávu všem účastníkům.');
    } finally {
      setEmailLoading(false);
    }
  };

  const sendReminder = async () => {
    if (participants.length===0||!user) return;
    setReminderLoading(true);
    try {
      await Promise.all(participants.filter(e=>e!==user.email).map(async (email) => {
        const {data:up, error: upError}=await supabase.from('user_profiles').select('user_id').eq('user_email',email).single();
        if (upError) throw upError;
        if (up) {
          const { error: notifError } = await supabase.from('notifications').insert({user_id:up.user_id,user_email:email,type:'event_reminder',title:`⏰ Připomínka: ${event.title}`,body:`Událost se koná ${format(new Date(event.date),'d. M. HH:mm')} na místě ${event.location}.`,event_id:event.id,is_read:false});
          if (notifError) throw notifError;
        }
      }));
      toast.success(tr.reminderSent?.(participants.length) || 'Připomínka odeslána!');
    } catch {
      toast.error('Nepodařilo se odeslat připomínku.');
    } finally {
      setReminderLoading(false);
    }
  };

  const handlePromote = async (email) => {
    const newWaitlist=waitlist.filter(e=>e!==email);
    const newParticipants=[...participants,email];
    const {data, error}=await supabase.from('events').update({participants:newParticipants,waitlist:newWaitlist}).eq('id',event.id).select().single();
    if (error) { toast.error('Nepodařilo se přesunout z čekačky.'); return; }
    if (data) onParticipantsChange?.(event.id,newParticipants,newWaitlist);
    const {data:up, error: upError}=await supabase.from('user_profiles').select('user_id').eq('user_email',email).single();
    if (upError) { toast.error('Nepodařilo se odeslat notifikaci.'); return; }
    if (up) {
      const { error: notifError } = await supabase.from('notifications').insert({user_id:up.user_id,user_email:email,type:'waitlist_promoted',title:`🎉 Dostal/a ses na akci: ${event.title}`,event_id:event.id,is_read:false});
      if (notifError) { toast.error('Nepodařilo se odeslat notifikaci.'); return; }
    }
    toast.success(tr.promotedToast?.(email)||`${email} přijat/a!`);
  };

  const handleRemove = async (email) => {
    setRemoveConfirm(null);
    setRemoving(true);
    try {
      const newParticipants = participants.filter(e => e !== email);
      const { error } = await supabase.from('events').update({ participants: newParticipants }).eq('id', event.id);
      if (error) { toast.error('Nepodařilo se odebrat účastníka.'); return; }
      onParticipantsChange?.(event.id, newParticipants, waitlist);
      const name = participantProfiles[email]?.display_name || email;
      const { data: up } = await supabase.from('user_profiles').select('user_id').eq('user_email', email).maybeSingle();
      if (up) {
        await supabase.from('notifications').insert({
          user_id: up.user_id, user_email: email, type: 'event_updated',
          title: `😔 ${lang === 'cs' ? 'Byl/a jsi odebrán/a z akce' : 'You were removed from the event'}: ${event.title}`,
          event_id: event.id, is_read: false,
        });
      }
      toast.success(tr.removedToast?.(name) || `${name} odebrán/a.`);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <button className="w-full flex items-start gap-3 p-4 text-left hover:bg-secondary/30 transition-colors" onClick={()=>setExpanded(e=>!e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.emoji} {getCategoryLabel(event.category,lang)}</span>{isFull&&<span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">Plné</span>}</div>
          <p className="font-grotesk font-semibold text-sm text-foreground">{event.title}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3"/>{event.location}</span>
            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3"/>{format(new Date(event.date),'EEE d MMM · HH:mm')}</span>
            <span className="flex items-center gap-0.5"><Users className="w-3 h-3"/>{participants.length}{event.max_capacity?`/${event.max_capacity}`:''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" className="rounded-lg h-7 px-2 text-xs" onClick={e=>{e.stopPropagation();navigate(`/event/${event.id}`);}}><ExternalLink className="w-3 h-3"/></Button>
          {expanded?<ChevronUp className="w-4 h-4 text-muted-foreground"/>:<ChevronDown className="w-4 h-4 text-muted-foreground"/>}
        </div>
      </button>

      {expanded&&(
        <div className="px-4 pb-4 space-y-4 border-t border-border/60 pt-4">
          {waitlist.length>0&&(
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{tr.waitlist} ({waitlist.length})</p>
              <div className="space-y-1.5">
                {waitlist.map((email,i)=>(
                  <div key={i} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                    <span className="text-xs text-foreground/80 truncate">{email}</span>
                    <button onClick={()=>handlePromote(email)} className="text-[11px] px-2 py-1 rounded-lg bg-mint text-emerald-700 font-medium hover:bg-emerald-100 flex items-center gap-1 flex-shrink-0"><ArrowUp className="w-3 h-3"/>{tr.promote}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{tr.participants} ({participants.length})</p>
            {participants.length===0 ? (
              <p className="text-xs text-muted-foreground">{tr.noParticipants}</p>
            ) : (
              <div className="space-y-1.5">
                {participants.map(email=>{
                  const p = participantProfiles[email];
                  const score = p?.reliability_score ?? 100;
                  const noShows = p?.noshow_count || 0;
                  const isSelf = email === user?.email;
                  return (
                    <div key={email} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold">
                          {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover"/> : <span>{(p?.display_name||email)[0]?.toUpperCase()}</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{p?.display_name || email}{isSelf ? ` (${lang==='cs'?'ty':'you'})` : ''}</p>
                          <p className={cn('text-[10px] flex items-center gap-1', score < 70 ? 'text-red-500' : 'text-muted-foreground')}>
                            {score < 70 && <ShieldAlert className="w-2.5 h-2.5"/>}
                            {tr.reliabilityScore}: {score}/100{noShows > 0 ? ` · ${tr.noShowsCount(noShows)}` : ''}
                          </p>
                        </div>
                      </div>
                      {!isSelf && (
                        <button onClick={()=>setRemoveConfirm(email)} disabled={removing} className="text-[11px] px-2 py-1 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 flex items-center gap-1 flex-shrink-0 disabled:opacity-50">
                          <UserX className="w-3 h-3"/>{tr.removeParticipant}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{tr.messageAll}</p>
            <textarea value={emailMsg} onChange={e=>setEmailMsg(e.target.value)} placeholder={tr.messagePlaceholder?.(participants.length)} className="w-full text-sm rounded-xl border border-border/60 bg-transparent p-3 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"/>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={sendMessage} disabled={emailLoading||!emailMsg.trim()||participants.length===0} className="rounded-xl gap-1.5 flex-1"><Mail className="w-3 h-3"/>{emailLoading?tr.sendingBtn:tr.sendBtn?.(participants.length)}</Button>
              <Button size="sm" variant="outline" onClick={sendReminder} disabled={reminderLoading} className="rounded-xl gap-1.5">{reminderLoading?tr.sendingReminder:tr.reminder}</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeConfirm}
        onConfirm={()=>handleRemove(removeConfirm)}
        onCancel={()=>setRemoveConfirm(null)}
        title={tr.removeParticipantTitle}
        description={removeConfirm ? tr.removeParticipantConfirm(participantProfiles[removeConfirm]?.display_name || removeConfirm) : ''}
        confirmLabel={tr.removeParticipant}
        destructive
      />
    </div>
  );
}

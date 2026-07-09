import { useState, useContext } from 'react';
import { format } from 'date-fns';
import { Users, Clock, MapPin, ChevronDown, ChevronUp, Mail, ExternalLink, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { LanguageContext } from '@/lib/language';
import ParticipantsPanel from '@/components/events/ParticipantsPanel';

export default function OrganizerEventCard({ event, onParticipantsChange }) {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const { user } = useCurrentUser();
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const [emailLoading, setEmailLoading] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const cat = getCategoryStyle(event.category);
  const participants = event.participants || [];
  const waitlist = event.waitlist || [];
  const isFull = event.max_capacity && participants.length >= event.max_capacity;

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
          <Button variant="outline" size="sm" onClick={()=>setParticipantsOpen(true)} className="w-full rounded-xl gap-1.5 justify-start">
            <UsersRound className="w-3.5 h-3.5"/>
            {tr.participants} ({participants.length}){waitlist.length>0?` · ${tr.waitlist} (${waitlist.length})`:''}
          </Button>

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

      <ParticipantsPanel
        event={event}
        isOrganizer
        open={participantsOpen}
        onClose={()=>setParticipantsOpen(false)}
        onEventUpdate={(updated)=>onParticipantsChange?.(event.id, updated.participants, updated.waitlist)}
      />
    </div>
  );
}

import { useState, useContext } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { LanguageContext } from '@/lib/language';
import ParticipantsPanel from '@/components/events/ParticipantsPanel';
import { SvIcon } from '@/components/icons/SvIcon';
import { svCard, svField, svSectionLabel } from '@/lib/svStyles';

const ghostBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--sv-surface-muted)', color: 'var(--sv-ink-soft)', borderRadius: 10, padding: '8px 14px', font: "500 12px 'Outfit', sans-serif" };
const actionBtn = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 10, padding: '8px 14px', font: "500 12px 'Outfit', sans-serif" };

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
    const recipients = participants.filter(email => email !== user?.email);
    if (!emailMsg.trim()||recipients.length===0||!user) return;
    setEmailLoading(true);
    try {
      // Resolve each recipient's user_id first — direct_messages RLS gates
      // reads on to_id = auth.uid(), so a row inserted with to_id left null
      // is silently invisible to the recipient (it only ever shows up for
      // the sender). Without this, "message all participants" looked like
      // it worked but nobody on the other end ever saw it.
      const { data: profiles, error: profilesError } = await supabase.from('user_profiles').select('user_id,user_email').in('user_email', recipients);
      if (profilesError) throw profilesError;
      const idByEmail = {};
      (profiles || []).forEach(p => { idByEmail[p.user_email] = p.user_id; });

      const content = emailMsg.trim();
      const rows = recipients.map(email => ({
        from_id: user.id, from_email: user.email, from_name: event.organizer_name || user.email,
        to_id: idByEmail[email] || null, to_email: email,
        event_id: event.id, event_title: event.title, is_broadcast: true,
        content, is_read: false,
      }));
      const { error } = await supabase.from('direct_messages').insert(rows);
      if (error) throw error;

      setEmailMsg('');
      toast.success(tr.messageSentToAll?.(recipients.length) || 'Zpráva odeslána všem účastníkům!');
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se odeslat zprávu všem účastníkům.' : 'Failed to message all participants.');
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
          const { error: notifError } = await supabase.from('notifications').insert({user_id:up.user_id,user_email:email,type:'event_reminder',data:{eventTitle:event.title,eventDate:event.date,location:event.location},event_id:event.id,is_read:false});
          if (notifError) throw notifError;
        }
      }));
      toast.success(tr.reminderSent?.(participants.length) || 'Připomínka odeslána!');
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se odeslat připomínku.' : 'Failed to send the reminder.');
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div style={{ ...svCard, overflow: 'hidden' }}>
      <button className="w-full flex items-start gap-3 text-left transition-colors" style={{ padding: '12px 14px' }} onClick={()=>setExpanded(e=>!e)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap" style={{ gap: 5, marginBottom: 6 }}>
            <span className="flex items-center flex-shrink-0" style={{ gap: 5, background: cat.bg, color: cat.ink, borderRadius: 'var(--sv-r-pill)', padding: '3px 8px', font: "400 10px 'Outfit', sans-serif" }}>
              <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 10 }}>{cat.emoji}</span>
              {getCategoryLabel(event.category,lang)}
            </span>
            {isFull && <span style={{ font: "400 10px 'Outfit', sans-serif", color: 'var(--sv-meta)', background: 'var(--sv-surface-muted)', borderRadius: 'var(--sv-r-pill)', padding: '3px 8px' }}>{lang === 'cs' ? 'Plné' : 'Full'}</span>}
          </div>
          <p className="line-clamp-1" style={{ font: "500 14.5px 'Outfit', sans-serif", letterSpacing: '-0.015em', color: 'var(--sv-ink)' }}>{event.title}</p>
          <div className="flex flex-wrap" style={{ gap: 12, marginTop: 5, font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
            <span className="flex items-center gap-1"><SvIcon name="pin" size={11} style={{ color: '#B4AEA6' }}/>{event.location}</span>
            <span className="flex items-center gap-1"><SvIcon name="clock" size={11} style={{ color: '#B4AEA6' }}/>{format(new Date(event.date),'EEE d MMM · HH:mm')}</span>
            <span className="flex items-center gap-1"><SvIcon name="users" size={11} style={{ color: '#B4AEA6' }}/>{participants.length}{event.max_capacity?`/${event.max_capacity}`:''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e=>{e.stopPropagation();navigate(`/event/${event.id}`);}} style={{ color: 'var(--sv-meta)' }}><ExternalLink className="w-3.5 h-3.5"/></button>
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--sv-meta)' }}/> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--sv-meta)' }}/>}
        </div>
      </button>

      {expanded&&(
        <div style={{ padding: '14px', borderTop: '1px solid var(--sv-hairline)' }} className="space-y-3.5">
          <button onClick={()=>setParticipantsOpen(true)} className="w-full flex items-center justify-start gap-1.5" style={{ ...ghostBtn, width: '100%' }}>
            <SvIcon name="users" size={13}/>
            {tr.participants} ({participants.length}){waitlist.length>0?` · ${tr.waitlist} (${waitlist.length})`:''}
          </button>

          <div>
            <p style={{ ...svSectionLabel, marginBottom: 8 }}>{tr.messageAll}</p>
            <textarea value={emailMsg} onChange={e=>setEmailMsg(e.target.value)} placeholder={tr.messagePlaceholder?.(participants.length)} className="w-full resize-none h-20 p-3" style={svField}/>
            <div className="flex gap-2 mt-2">
              <button onClick={sendMessage} disabled={emailLoading||!emailMsg.trim()||participants.length===0} className="flex-1" style={{ ...actionBtn, opacity: (emailLoading||!emailMsg.trim()||participants.length===0) ? 0.5 : 1 }}><Mail className="w-3 h-3"/>{emailLoading?tr.sendingBtn:tr.sendBtn?.(participants.length)}</button>
              <button onClick={sendReminder} disabled={reminderLoading} style={{ ...ghostBtn, opacity: reminderLoading ? 0.5 : 1 }}>{reminderLoading?tr.sendingReminder:tr.reminder}</button>
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

import { useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageContext } from '@/lib/language';
import { SvIcon } from '@/components/icons/SvIcon';
import { svField } from '@/lib/svStyles';

export default function SendDMModal({ open, onClose, toEmail, toName, fromUser, fromProfile, event }) {
  const { lang } = useContext(LanguageContext);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data: toProfile } = await supabase.from('user_profiles').select('user_id').eq('user_email',toEmail).maybeSingle();
      const { error } = await supabase.from('direct_messages').insert({from_id:fromUser.id,from_email:fromUser.email,from_name:fromProfile?.display_name||fromUser.email,from_avatar:fromProfile?.avatar_url||null,to_id:toProfile?.user_id||null,to_email:toEmail,event_id:event?.id||null,event_title:event?.title||null,content:content.trim(),is_read:false});
      if (error) throw error;
      setContent(''); toast.success(lang === 'cs' ? 'Zpráva odeslána!' : 'Message sent!'); onClose();
    } catch { toast.error(lang === 'cs' ? 'Zprávu se nepodařilo odeslat.' : 'Failed to send the message.'); } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <DialogHeader><DialogTitle style={{ font: "500 15px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{lang === 'cs' ? 'Soukromá zpráva' : 'Direct message'} → {toName}</DialogTitle></DialogHeader>
        {event && (
          <div className="flex items-center gap-1.5 mb-1" style={{ background: '#F0EAFC', borderRadius: 10, padding: '8px 12px', font: "300 11.5px 'Outfit', sans-serif", color: '#5A4A83' }}>
            <SvIcon name="calendar" size={12} style={{ color: 'var(--sv-brand-purple)' }}/>
            {lang === 'cs' ? 'Ohledně události:' : 'Regarding event:'} <span style={{ fontWeight: 500, color: '#4A3A73' }}>{event.title}</span>
          </div>
        )}
        <Textarea value={content} onChange={e=>setContent(e.target.value)} placeholder={lang === 'cs' ? 'Napiš svou zprávu...' : 'Write your message...'} className="resize-none min-h-[120px]" style={svField} autoFocus/>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} style={{ background: 'var(--sv-surface-muted)', color: 'var(--sv-ink-soft)', borderRadius: 'var(--sv-r-pill)', padding: '8px 16px', font: "500 12.5px 'Outfit', sans-serif" }}>{lang === 'cs' ? 'Zrušit' : 'Cancel'}</button>
          <button onClick={handleSend} disabled={sending||!content.trim()} className="flex items-center gap-2" style={{ background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 'var(--sv-r-pill)', padding: '8px 16px', font: "500 12.5px 'Outfit', sans-serif", opacity: (sending||!content.trim())?0.5:1 }}>{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}{lang === 'cs' ? 'Odeslat' : 'Send'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SendDMModal({ open, onClose, toEmail, toName, fromUser, fromProfile, event }) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await supabase.from('direct_messages').insert({from_id:fromUser.id,from_email:fromUser.email,from_name:fromProfile?.display_name||fromUser.email,from_avatar:fromProfile?.avatar_url||null,to_email:toEmail,event_id:event?.id||null,event_title:event?.title||null,content:content.trim(),is_read:false});
      setContent(''); toast.success('Zpráva odeslána!'); onClose();
    } catch { toast.error('Zprávu se nepodařilo odeslat.'); } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-grotesk">Soukromá zpráva → {toName}</DialogTitle></DialogHeader>
        {event&&<div className="bg-secondary/60 rounded-xl px-3 py-2 text-xs text-muted-foreground mb-1">📅 Ohledně události: <span className="font-medium text-foreground">{event.title}</span></div>}
        <Textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Napiš svou zprávu..." className="resize-none min-h-[120px] rounded-xl" autoFocus/>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Zrušit</Button>
          <Button onClick={handleSend} disabled={sending||!content.trim()} className="rounded-xl gap-2">{sending?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}Odeslat</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

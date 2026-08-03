import { useState, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { LanguageContext } from '@/lib/language';

const REASONS = {
  cs: [{value:'inappropriate',label:'🚫 Nevhodný obsah'},{value:'spam',label:'📢 Spam'},{value:'fraud',label:'⚠️ Podvod'},{value:'hate',label:'💢 Nenávistný obsah'},{value:'other',label:'❓ Jiné'}],
  en: [{value:'inappropriate',label:'🚫 Inappropriate content'},{value:'spam',label:'📢 Spam'},{value:'fraud',label:'⚠️ Fraud'},{value:'hate',label:'💢 Hateful content'},{value:'other',label:'❓ Other'}],
};

export default function ReportModal({ eventId, eventTitle, user, open, onClose }) {
  const { lang } = useContext(LanguageContext);
  const REASONS_L = REASONS[lang] || REASONS.en;
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!selected||!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('reports').insert({target_id:eventId,target_type:'event',reason:selected,reporter_id:user.id,reporter_email:user.email});
      if (error) { toast.error(lang === 'cs' ? 'Nahlášení se nepodařilo odeslat.' : 'Failed to submit the report.'); return; }
      setDone(true);
      try {
        const { data: mods } = await supabase.from('user_profiles').select('user_id,user_email').or('is_admin.eq.true,is_moderator.eq.true');
        await Promise.all((mods||[]).map(m => supabase.from('notifications').insert({
          user_id: m.user_id, user_email: m.user_email, type: 'new_report',
          data: { eventTitle: eventTitle || (lang === 'cs' ? 'událost' : 'event'), reason: selected },
          event_id: eventId, is_read: false,
        })));
      } catch {
        // Notifikace moderátorům není kritická, nahlášení už proběhlo.
      }
    } catch {
      toast.error(lang === 'cs' ? 'Nahlášení se nepodařilo odeslat.' : 'Failed to submit the report.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { setSelected(null); setDone(false); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2 font-grotesk"><Flag className="w-4 h-4 text-muted-foreground"/> {lang === 'cs' ? 'Nahlásit událost' : 'Report event'}</DialogTitle></DialogHeader>
        {done ? <div className="text-center py-6"><div className="text-4xl mb-3">✅</div><p className="font-semibold mb-1">{lang === 'cs' ? 'Nahlášení odesláno' : 'Report submitted'}</p><p className="text-sm text-muted-foreground">{lang === 'cs' ? 'Děkujeme, naši moderátoři to prověří.' : 'Thanks, our moderators will review it.'}</p><Button className="mt-5 rounded-xl w-full" onClick={handleClose}>{lang === 'cs' ? 'Zavřít' : 'Close'}</Button></div>
        : <><p className="text-sm text-muted-foreground mb-3">{lang === 'cs' ? 'Vyberte důvod nahlášení:' : 'Choose a reason for reporting:'}</p>
            <div className="space-y-2">{REASONS_L.map(r=><button key={r.value} onClick={()=>setSelected(r.value)} className={cn('w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',selected===r.value?'border-primary bg-lavender text-primary':'border-border hover:bg-secondary')}>{r.label}</button>)}</div>
            <div className="flex gap-2 mt-4"><Button variant="outline" className="flex-1 rounded-xl" onClick={handleClose}>{lang === 'cs' ? 'Zrušit' : 'Cancel'}</Button><Button className="flex-1 rounded-xl" disabled={!selected||loading} onClick={handleSubmit}>{loading?(lang === 'cs' ? 'Odesílám...' : 'Submitting...'):(lang === 'cs' ? 'Nahlásit' : 'Report')}</Button></div>
          </>}
      </DialogContent>
    </Dialog>
  );
}

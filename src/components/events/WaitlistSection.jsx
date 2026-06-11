import { supabase } from '@/lib/supabaseClient';

export default function WaitlistSection({ event, user, onPromote, onDecline }) {
  const isOrganizer = user && event?.organizer_email === user.email;
  const waitlist = event?.waitlist || [];
  if (waitlist.length===0) return null;

  const handleDecline = async (email) => {
    const {data:up}=await supabase.from('user_profiles').select('user_id').eq('user_email',email).single();
    if (up) await supabase.from('notifications').insert({user_id:up.user_id,user_email:email,type:'event_updated',title:`😔 Nebyl/a jsi přijat/a na akci: ${event.title}`,event_id:event.id,is_read:false}).catch(()=>{});
    onDecline?.(email);
  };

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Čekačka ({waitlist.length})</p>
      <div className="space-y-1.5">
        {waitlist.map((email,i)=>(
          <div key={i} className="flex items-center justify-between gap-2 bg-secondary/40 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-peach flex items-center justify-center text-orange-700 text-xs font-bold">{email[0].toUpperCase()}</div><span className="text-xs text-foreground/80 truncate max-w-32">{email}</span></div>
            {isOrganizer&&<div className="flex gap-1">
              {onPromote&&<button onClick={()=>onPromote(email)} className="text-[11px] px-2 py-1 rounded-lg bg-mint text-emerald-700 font-medium hover:bg-emerald-100 transition-colors">✓ Přijmout</button>}
              <button onClick={()=>handleDecline(email)} className="text-[11px] px-2 py-1 rounded-lg bg-blush text-pink-700 font-medium hover:bg-red-100 transition-colors">✕ Odmítnout</button>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

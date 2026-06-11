import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const TYPE_ICONS = { event_reminder:'⏰', event_updated:'✏️', new_participant:'🙌', waitlist_promoted:'🎉', new_report:'🚩', new_message:'💬', new_chat_message:'💬' };

export default function NotificationBell() {
  const tr = useT();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20).then(({data})=>setNotifications(data||[]));

    const ch = supabase.channel('bell-notifs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>{if(p.new.user_id===user.id)setNotifications(prev=>[p.new,...prev]);})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},p=>setNotifications(prev=>prev.map(n=>n.id===p.new.id?p.new:n)))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [user?.id]);

  useEffect(() => {
    const handler = e => { if (ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown',handler);
    return ()=>document.removeEventListener('mousedown',handler);
  }, []);

  const unreadCount = notifications.filter(n=>!n.is_read).length;
  const markRead = async (n) => { if (n.is_read) return; await supabase.from('notifications').update({is_read:true}).eq('id',n.id); setNotifications(prev=>prev.map(x=>x.id===n.id?{...x,is_read:true}:x)); };
  const markAllRead = async () => { const unread=notifications.filter(n=>!n.is_read); await Promise.all(unread.map(n=>supabase.from('notifications').update({is_read:true}).eq('id',n.id))); setNotifications(prev=>prev.map(n=>({...n,is_read:true}))); };

  return (
    <div className="relative" ref={ref}>
      <button onClick={()=>setOpen(o=>!o)} className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
        <Bell className="w-5 h-5 text-muted-foreground"/>
        {unreadCount>0&&<span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">{unreadCount>9?'9+':unreadCount}</span>}
      </button>
      {open&&(
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-grotesk font-semibold text-sm">{tr.notifBellTitle}</span>
            {unreadCount>0&&<button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><CheckCheck className="w-3.5 h-3.5"/> {tr.notifMarkAllRead}</button>}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length===0 ? <div className="text-center py-10"><p className="text-2xl mb-1">🔔</p><p className="text-sm text-muted-foreground">{tr.notifNone}</p></div>
            : notifications.map(n=>(
              <div key={n.id} onClick={()=>markRead(n)} className={cn('flex gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/40 last:border-0',!n.is_read&&'bg-lavender/20')}>
                <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[n.type]||'🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2"><p className={cn('text-xs font-medium leading-snug flex-1',!n.is_read?'text-foreground':'text-foreground/70')}>{n.title}</p>{!n.is_read&&<div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1"/>}</div>
                  {n.body&&<p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at),'MMM d, HH:mm')}</span>
                    {n.event_id&&<Link to={`/event/${n.event_id}`} onClick={e=>{e.stopPropagation();setOpen(false);}} className="text-[11px] text-primary font-medium hover:underline">{tr.notifViewEvent}</Link>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border px-4 py-2.5"><Link to="/notifications" onClick={()=>setOpen(false)} className="text-xs text-primary font-medium hover:underline">{tr.notifSeeAll}</Link></div>
        </div>
      )}
    </div>
  );
}

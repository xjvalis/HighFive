import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const TYPE_ICONS = { event_reminder:'⏰', event_updated:'✏️', new_participant:'🙌', waitlist_promoted:'🎉', new_report:'🚩', new_message:'💬', new_chat_message:'💬' };

export default function Notifications() {
  const tr = useT();
  const { user } = useCurrentUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
      .then(({data})=>{setNotifications(data||[]);setLoading(false);});

    const ch = supabase.channel('notif-page')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>{if(p.new.user_id===user.id)setNotifications(prev=>[p.new,...prev]);})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},p=>setNotifications(prev=>prev.map(n=>n.id===p.new.id?p.new:n)))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [user?.id]);

  const markAllRead = async () => {
    const unread=notifications.filter(n=>!n.is_read);
    await Promise.all(unread.map(n=>supabase.from('notifications').update({is_read:true}).eq('id',n.id)));
    setNotifications(prev=>prev.map(n=>({...n,is_read:true})));
  };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    await supabase.from('notifications').update({is_read:true}).eq('id',notif.id);
    setNotifications(prev=>prev.map(n=>n.id===notif.id?{...n,is_read:true}:n));
  };

  const unreadCount = notifications.filter(n=>!n.is_read).length;

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5"/><h1 className="font-grotesk font-bold text-xl">{tr.notificationsTitle}</h1>
          {unreadCount>0&&<span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-semibold">{unreadCount}</span>}
        </div>
        {unreadCount>0&&<Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1.5"><CheckCheck className="w-3.5 h-3.5"/>{tr.markAllRead}</Button>}
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>
      : notifications.length===0 ? <div className="text-center py-16"><p className="text-4xl mb-3">🔔</p><p className="font-grotesk font-semibold">{tr.noNotifications}</p><p className="text-sm text-muted-foreground mt-1">{tr.noNotificationsHint}</p></div>
      : <div className="space-y-2">
          {notifications.map(n=>(
            <div key={n.id} onClick={()=>markRead(n)} className={cn('bg-card rounded-2xl border border-border/60 p-4 cursor-pointer hover:shadow-md transition-all',!n.is_read&&'border-violet-200 bg-lavender/20')}>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">{TYPE_ICONS[n.type]||'🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2"><p className={cn('text-sm font-medium leading-snug',n.is_read&&'text-foreground/70')}>{n.title}</p>{!n.is_read&&<div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1"/>}</div>
                  {n.body&&<p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">{format(new Date(n.created_at),'MMM d, HH:mm')}</span>
                    {n.event_id&&<Link to={`/event/${n.event_id}`} onClick={e=>e.stopPropagation()} className="text-[11px] text-primary font-medium hover:underline">{tr.viewEvent}</Link>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

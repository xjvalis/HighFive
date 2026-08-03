import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { LanguageContext } from '@/lib/language';
import { renderNotification } from '@/lib/notifTemplates';

export default function Notifications() {
  const tr = useT();
  const { lang } = useContext(LanguageContext);
  const navigate = useNavigate();
  const { user, loading: userLoading } = useCurrentUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && !userLoading) navigate('/login');
  }, [user, userLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50)
      .then(({data, error})=>{
        if (error) toast.error(tr.notifLoadFailed);
        setNotifications(data||[]);setLoading(false);
      });

    const ch = supabase.channel('notif-page')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},p=>{if(p.new.user_id===user.id)setNotifications(prev=>[p.new,...prev]);})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications'},p=>setNotifications(prev=>prev.map(n=>n.id===p.new.id?p.new:n)))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, [user?.id]);

  const markAllRead = async () => {
    const unread=notifications.filter(n=>!n.is_read);
    try {
      await Promise.all(unread.map(n=>supabase.from('notifications').update({is_read:true}).eq('id',n.id)));
      setNotifications(prev=>prev.map(n=>({...n,is_read:true})));
    } catch {
      toast.error(tr.notifMarkAllReadFailed);
    }
  };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    const { error } = await supabase.from('notifications').update({is_read:true}).eq('id',notif.id);
    if (error) { toast.error(tr.notifMarkReadFailed); return; }
    setNotifications(prev=>prev.map(n=>n.id===notif.id?{...n,is_read:true}:n));
  };

  const unreadCount = notifications.filter(n=>!n.is_read).length;

  if (!user && !userLoading) return null;

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
          {notifications.map(n=>{
            const rendered = renderNotification(n, lang);
            return (
            <div key={n.id} onClick={()=>{markRead(n);if(n.event_id)window.open(`/event/${n.event_id}`,'_blank');}} className={cn('bg-card rounded-2xl border border-border/60 p-4 cursor-pointer hover:shadow-md transition-all',!n.is_read&&'border-violet-200 bg-lavender/20')}>
              <div className="flex gap-3">
                <span className="text-xl flex-shrink-0">{rendered.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn('text-sm font-medium leading-snug',n.is_read&&'text-foreground/70')}>{rendered.title}</p>
                    {!n.is_read&&(
                      <button onClick={e=>{e.stopPropagation();markRead(n);}} className="p-1.5 -m-1.5 flex-shrink-0" title={tr.markAllRead}>
                        <div className="w-3 h-3 rounded-full bg-primary"/>
                      </button>
                    )}
                  </div>
                  {rendered.body&&<p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rendered.body}</p>}
                  <span className="text-[10px] text-muted-foreground mt-2 block">{format(new Date(n.created_at),'MMM d, HH:mm')}</span>
                </div>
              </div>
            </div>
          );})}
        </div>}
    </div>
  );
}

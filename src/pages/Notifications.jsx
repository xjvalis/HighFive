import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { Bell, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';
import { LanguageContext } from '@/lib/language';
import { renderNotification } from '@/lib/notifTemplates';
import EmptyState from '@/components/ui/EmptyState';
import { svPageTitle, svCard, svMeta } from '@/lib/svStyles';

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

    const ch = supabase.channel(`notif-page-${Math.random().toString(36).slice(2)}`)
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
    <div className="max-w-xl mx-auto pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" style={{ color: 'var(--sv-meta)' }}/><h1 style={svPageTitle}>{tr.notificationsTitle}</h1>
          {unreadCount>0&&<span className="flex items-center justify-center" style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', font: "500 10.5px 'Outfit', sans-serif" }}>{unreadCount}</span>}
        </div>
        {unreadCount>0&&<button onClick={markAllRead} className="flex items-center gap-1.5" style={{ font: "500 11px 'Outfit', sans-serif", color: 'var(--sv-link)' }}><CheckCheck className="w-3.5 h-3.5"/>{tr.markAllRead}</button>}
      </div>
      {loading ? <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/></div>
      : notifications.length===0 ? <EmptyState title={tr.noNotifications} note={tr.noNotificationsHint} />
      : <div className="space-y-2">
          {notifications.map(n=>{
            const rendered = renderNotification(n, lang);
            return (
            <div key={n.id} onClick={()=>{markRead(n);if(n.event_id)window.open(`/event/${n.event_id}`,'_blank');}} className="cursor-pointer transition-colors" style={{ ...svCard, padding: 14, borderColor: n.is_read ? 'var(--sv-hairline)' : '#E4D4F7', background: n.is_read ? 'var(--sv-surface)' : '#F8F4FC' }}>
              <div className="flex gap-3">
                <span className="flex-shrink-0" style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 18 }}>{rendered.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="leading-snug" style={{ font: "500 12.5px 'Outfit', sans-serif", color: n.is_read ? 'var(--sv-ink-soft)' : 'var(--sv-ink)' }}>{rendered.title}</p>
                    {!n.is_read&&(
                      <button onClick={e=>{e.stopPropagation();markRead(n);}} className="flex-shrink-0" style={{ padding: 6, margin: -6 }} title={tr.markAllRead}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sv-empty-dot)' }}/>
                      </button>
                    )}
                  </div>
                  {rendered.body&&<p style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)', lineHeight: 1.5, marginTop: 2 }}>{rendered.body}</p>}
                  <span style={{ ...svMeta, font: "400 10px 'IBM Plex Mono', monospace", marginTop: 8, display: 'block' }}>{format(new Date(n.created_at),'MMM d, HH:mm')}</span>
                </div>
              </div>
            </div>
          );})}
        </div>}
    </div>
  );
}

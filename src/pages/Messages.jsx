import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { format } from 'date-fns';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

export default function Messages() {
  const tr = useT();
  const { user, profile } = useCurrentUser();
  if (!user && !loading) { navigate('/login'); return null; }
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [partnerProfiles, setPartnerProfiles] = useState({});
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const chanRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('direct_messages').select('*').or(`from_email.eq.${user.email},to_email.eq.${user.email}`).order('created_at',{ascending:false}).limit(200)
      .then(async ({data}) => {
        setMessages(data||[]);
        const emails = [...new Set((data||[]).map(m=>m.from_email===user.email?m.to_email:m.from_email))];
        if (emails.length) {
          const {data:pp} = await supabase.from('user_profiles').select('user_email,display_name,avatar_url').in('user_email',emails);
          const m={}; (pp||[]).forEach(p=>m[p.user_email]=p); setPartnerProfiles(m);
        }
        setLoading(false);
      });

    const ch = supabase.channel('dm-page')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},p=>{
        const msg=p.new;
        if (msg.from_email===user.email||msg.to_email===user.email)
          setMessages(prev=>prev.find(m=>m.id===msg.id)?prev:[msg,...prev]);
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'direct_messages'},p=>setMessages(prev=>prev.map(m=>m.id===p.new.id?p.new:m)))
      .subscribe();
    chanRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [selected, messages.length]);

  const threads = (() => {
    if (!user) return [];
    const map = {};
    messages.forEach(msg => {
      const partner = msg.from_email===user.email?msg.to_email:msg.from_email;
      if (!map[partner]) map[partner]={partnerEmail:partner,messages:[],unread:0};
      map[partner].messages.push(msg);
      if (msg.to_email===user.email&&!msg.is_read) map[partner].unread++;
    });
    return Object.values(map).sort((a,b)=>(b.messages[0]?.created_at||'').localeCompare(a.messages[0]?.created_at||''));
  })();

  const threadMessages = selected ? messages.filter(m=>m.from_email===selected||m.to_email===selected).sort((a,b)=>a.created_at.localeCompare(b.created_at)) : [];

  const openThread = async (email) => {
    setSelected(email);
    const unreadIds = messages.filter(m=>m.from_email===email&&m.to_email===user.email&&!m.is_read).map(m=>m.id);
    if (unreadIds.length) {
      await supabase.from('direct_messages').update({is_read:true}).in('id',unreadIds);
      setMessages(prev=>prev.map(m=>unreadIds.includes(m.id)?{...m,is_read:true}:m));
    }
  };

  const handleSend = async () => {
    if (!reply.trim()||!selected||sending) return;
    setSending(true);
    const content=reply.trim(); setReply('');
    await supabase.from('direct_messages').insert({from_id:user.id,from_email:user.email,from_name:profile?.display_name||user.email,from_avatar:profile?.avatar_url||null,to_email:selected,content,is_read:false});
    setSending(false);
  };

  const pName = (email) => partnerProfiles[email]?.display_name||email;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-3 mb-4">
        {selected&&<button onClick={()=>setSelected(null)} className="p-1.5 hover:bg-secondary rounded-lg"><ArrowLeft className="w-4 h-4"/></button>}
        <h1 className="font-grotesk font-bold text-xl">{selected?pName(selected):tr.messages}</h1>
      </div>

      {!selected ? (
        <div className="space-y-1">
          {threads.length===0 ? (
            <div className="text-center py-16"><p className="text-4xl mb-3">💬</p><p className="font-grotesk font-semibold">{lang==='cs'?'Žádné zprávy':'No messages'}</p><p className="text-sm text-muted-foreground mt-1">{lang==='cs'?'Napiš někomu z události!':'Send a message from an event!'}</p></div>
          ) : threads.map(t=>{
            const last=t.messages[0];
            return (
              <button key={t.partnerEmail} onClick={()=>openThread(t.partnerEmail)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/60 transition-all text-left">
                <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">{pName(t.partnerEmail)[0]?.toUpperCase()||'?'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><span className={cn('text-sm font-medium',t.unread>0&&'font-bold')}>{pName(t.partnerEmail)}</span>{last&&<span className="text-[10px] text-muted-foreground">{format(new Date(last.created_at),'HH:mm')}</span>}</div>
                  <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground truncate max-w-[200px]">{last?.content||''}</p>{t.unread>0&&<span className="min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">{t.unread}</span>}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col flex-1 bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadMessages.map(msg=>(
              <div key={msg.id} className={`flex gap-2 ${msg.from_email===user.email?'flex-row-reverse':''}`}>
                <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold flex-shrink-0">{(msg.from_email===user.email?(profile?.display_name||user.email):pName(msg.from_email))[0]?.toUpperCase()}</div>
                <div className={`max-w-[70%] flex flex-col ${msg.from_email===user.email?'items-end':'items-start'}`}>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${msg.from_email===user.email?'bg-primary text-primary-foreground rounded-tr-sm':'bg-secondary rounded-tl-sm'}`}>{msg.content}</div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(msg.created_at),'HH:mm')}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div className="flex gap-2 p-3 border-t border-border/60">
            <Textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder="Napiš zprávu..." className="rounded-xl text-sm min-h-[40px] max-h-[120px] resize-none" rows={1}/>
            <Button onClick={handleSend} disabled={sending||!reply.trim()} size="sm" className="rounded-xl px-3 self-end">{sending?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

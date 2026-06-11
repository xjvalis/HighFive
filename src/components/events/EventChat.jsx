import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatDisplayName } from '@/lib/utils';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';

export default function EventChat({ event, user, profile }) {
  const tr = useT();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const chanRef = useRef(null);

  const isJoined = user && event?.participants?.includes(user.email);
  const isOrganizer = user && event?.organizer_email === user.email;
  const canChat = isJoined || isOrganizer;
  const eventDate = event?.date ? new Date(event.date) : null;
  const archiveDate = eventDate ? new Date(eventDate.getTime() + 3*24*60*60*1000) : null;
  const isArchived = archiveDate && new Date() > archiveDate;

  useEffect(() => {
    if (!canChat||!event?.id) return;
    supabase.from('event_chat').select('*').eq('event_id',event.id).order('created_at',{ascending:true}).limit(100)
      .then(({data})=>{setMessages(data||[]);setLoading(false);});

    const ch = supabase.channel(`chat-${event.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'event_chat',filter:`event_id=eq.${event.id}`},
        p=>{setMessages(prev=>prev.find(m=>m.id===p.new.id)?prev:[...prev,p.new]);})
      .subscribe();
    chanRef.current = ch;
    return () => { if (chanRef.current) supabase.removeChannel(chanRef.current); };
  }, [event?.id, canChat]);

  useEffect(() => { if (messages.length>0) bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()||!user||isArchived) return;
    const content=newMsg.trim(); setNewMsg('');
    const {error}=await supabase.from('event_chat').insert({event_id:event.id,author_id:user.id,author_email:user.email,author_name:formatDisplayName(profile?.display_name)||user.email,author_avatar:profile?.avatar_url||null,content});
    if (error) { setNewMsg(content); toast.error('Nepodařilo se odeslat zprávu.'); }
  };

  if (!canChat) return null;

  return (
    <div className="mt-5 bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/60">
        <div><h2 className="font-grotesk font-semibold text-base">{tr.chatTitle}</h2><p className="text-xs text-muted-foreground">{tr.chatOnlyForGoing} · {isArchived?tr.chatArchived:archiveDate?`${tr.chatCloses} ${format(archiveDate,'MMM d')}`:''}</p></div>
        {isArchived&&<span className="text-xs bg-secondary text-muted-foreground px-2 py-1 rounded-full">{tr.chatArchived}</span>}
      </div>
      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-secondary/20">
        {loading?<div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>
        :messages.length===0?<p className="text-xs text-muted-foreground text-center py-8">{tr.chatEmpty}</p>
        :messages.map(msg=>(
          <div key={msg.id} className={`flex gap-2 ${msg.author_email===user?.email?'flex-row-reverse':''}`}>
            <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold flex-shrink-0">{msg.author_name?.[0]?.toUpperCase()||'?'}</div>
            <div className={`max-w-[75%] ${msg.author_email===user?.email?'items-end':'items-start'} flex flex-col`}>
              {msg.author_email!==user?.email&&<span className="text-[10px] text-muted-foreground mb-0.5 ml-1">{msg.author_name}</span>}
              <div className={`px-3 py-1.5 rounded-2xl text-sm leading-relaxed ${msg.author_email===user?.email?'bg-primary text-primary-foreground rounded-tr-sm':'bg-card border border-border/60 rounded-tl-sm'}`}>{msg.content}</div>
              <span className="text-[10px] text-muted-foreground mt-0.5 mx-1">{format(new Date(msg.created_at),'HH:mm')}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      {!isArchived&&<div className="flex gap-2 p-3 border-t border-border/60">
        <Input value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder={tr.chatPlaceholder} className="rounded-xl text-sm h-9"/>
        <Button onClick={sendMessage} size="sm" className="rounded-xl px-3 h-9"><Send className="w-3.5 h-3.5"/></Button>
      </div>}
    </div>
  );
}

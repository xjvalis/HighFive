import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useContext } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { format } from 'date-fns';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import { LanguageContext } from '@/lib/language';
import EmptyState from '@/components/ui/EmptyState';
import { svPageTitle, svCard, svField } from '@/lib/svStyles';

export default function Messages() {
  const tr = useT();
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const { user, profile, loading: userLoading } = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [partnerProfiles, setPartnerProfiles] = useState({});
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const chanRef = useRef(null);

  useEffect(() => {
    if (!user && !userLoading) navigate('/login');
  }, [user, userLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from('direct_messages').select('*').or(`from_email.eq.${user.email},to_email.eq.${user.email}`).order('created_at',{ascending:false}).limit(200)
      .then(async ({data, error}) => {
        if (error) { toast.error(lang==='cs'?'Nepodařilo se načíst zprávy.':'Failed to load messages.'); setLoading(false); return; }
        setMessages(data||[]);
        const emails = [...new Set((data||[]).map(m=>m.from_email===user.email?m.to_email:m.from_email))];
        if (emails.length) {
          const {data:pp, error: ppError} = await supabase.from('user_profiles').select('user_email,display_name,avatar_url').in('user_email',emails);
          if (ppError) { toast.error(lang==='cs'?'Nepodařilo se načíst profily.':'Failed to load profiles.'); setLoading(false); return; }
          const m={}; (pp||[]).forEach(p=>m[p.user_email]=p); setPartnerProfiles(m);
        }
        setLoading(false);
      });

    const ch = supabase.channel(`dm-page-${Math.random().toString(36).slice(2)}`)
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
      const { error } = await supabase.from('direct_messages').update({is_read:true}).in('id',unreadIds);
      if (error) { toast.error(lang==='cs'?'Nepodařilo se označit zprávy jako přečtené.':'Failed to mark messages as read.'); return; }
      setMessages(prev=>prev.map(m=>unreadIds.includes(m.id)?{...m,is_read:true}:m));
    }
  };

  const handleSend = async () => {
    if (!reply.trim()||!selected||sending) return;
    setSending(true);
    const content=reply.trim(); setReply('');
    try {
      const { data: toProfile } = await supabase.from('user_profiles').select('user_id').eq('user_email',selected).maybeSingle();
      const { error } = await supabase.from('direct_messages').insert({from_id:user.id,from_email:user.email,from_name:profile?.display_name||user.email,from_avatar:profile?.avatar_url||null,to_id:toProfile?.user_id||null,to_email:selected,content,is_read:false});
      if (error) toast.error(lang==='cs'?'Zprávu se nepodařilo odeslat.':'Failed to send message.');
    } catch {
      toast.error(lang==='cs'?'Zprávu se nepodařilo odeslat.':'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const pName = (email) => partnerProfiles[email]?.display_name||email;

  if (!user && !userLoading) return null;
  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/></div>;

  // dvh (not vh) so iOS Safari's collapsing URL bar doesn't push the composer
  // off-screen; subtracts the layout's top nav + bottom nav padding.
  return (
    <div className="flex flex-col h-[calc(100dvh-136px)] xl:h-[calc(100dvh-72px)] pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="flex items-center gap-3 mb-4">
        {selected&&<button onClick={()=>setSelected(null)} style={{ color: 'var(--sv-meta)' }}><ArrowLeft className="w-4 h-4"/></button>}
        <h1 style={svPageTitle}>{selected?pName(selected):tr.messages}</h1>
      </div>

      {!selected ? (
        <div className="space-y-1">
          {threads.length===0 ? (
            <EmptyState title={lang==='cs'?'Žádné zprávy':'No messages'} note={lang==='cs'?'Napiš někomu z události!':'Send a message from an event!'} />
          ) : threads.map(t=>{
            const last=t.messages[0];
            return (
              <button key={t.partnerEmail} onClick={()=>openThread(t.partnerEmail)} className="w-full flex items-center gap-3 text-left transition-colors" style={{ padding: 12, borderRadius: 14 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#F0EAFC', color: 'var(--sv-brand-purple)', font: "500 13px 'Outfit', sans-serif" }}>{pName(t.partnerEmail)[0]?.toUpperCase()||'?'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><span style={{ font: `${t.unread>0?500:400} 12.5px 'Outfit', sans-serif`, color: 'var(--sv-ink)' }}>{pName(t.partnerEmail)}</span>{last&&<span style={{ font: "400 10px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)' }}>{format(new Date(last.created_at),'HH:mm')}</span>}</div>
                  <div className="flex items-center justify-between"><p className="truncate max-w-[200px]" style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>{last?.content||''}</p>{t.unread>0&&<span className="flex items-center justify-center flex-shrink-0" style={{ minWidth: 17, height: 17, borderRadius: 999, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', font: "500 10px 'Outfit', sans-serif", padding: '0 4px' }}>{t.unread}</span>}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden" style={svCard}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {threadMessages.map(msg=>{
              const mine = msg.from_email===user.email;
              return (
                <div key={msg.id} className={`flex gap-2 ${mine?'flex-row-reverse':''}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: mine ? '#F0EAFC' : 'var(--sv-surface-muted)', color: mine ? 'var(--sv-brand-purple)' : 'var(--sv-ink-soft)', font: "500 11px 'Outfit', sans-serif" }}>{(mine?(profile?.display_name||user.email):pName(msg.from_email))[0]?.toUpperCase()}</div>
                  <div className={`max-w-[70%] flex flex-col ${mine?'items-end':'items-start'}`}>
                    <div style={{ padding: '8px 12px', borderRadius: 14, font: "300 12.5px 'Outfit', sans-serif", background: mine ? 'var(--sv-action-bg)' : 'var(--sv-surface-muted)', color: mine ? 'var(--sv-action-ink)' : 'var(--sv-ink-soft)' }}>{msg.content}</div>
                    <span style={{ font: "400 10px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)', marginTop: 3 }}>{format(new Date(msg.created_at),'HH:mm')}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </div>
          <div className="flex gap-2 p-3" style={{ borderTop: '1px solid var(--sv-hairline)' }}>
            <Textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder={lang === 'cs' ? 'Napiš zprávu...' : 'Write a message...'} className="min-h-[40px] max-h-[120px] resize-none" style={svField} rows={1}/>
            <button onClick={handleSend} disabled={sending||!reply.trim()} className="flex items-center justify-center self-end flex-shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', opacity: (sending||!reply.trim())?0.5:1 }}>{sending?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}</button>
          </div>
        </div>
      )}
    </div>
  );
}

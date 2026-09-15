import { useNavigate, Link, useSearchParams } from 'react-router-dom';
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
import { SvIcon } from '@/components/icons/SvIcon';
import { svPageTitle, svCard, svField } from '@/lib/svStyles';

export default function Messages() {
  const tr = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang } = useContext(LanguageContext);
  const { user, profile, loading: userLoading } = useCurrentUser();
  const [messages, setMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMeta, setGroupMeta] = useState({}); // event_id -> { title, organizerId }
  const [loading, setLoading] = useState(true);
  // { type: 'dm', key: partnerEmail } | { type: 'group', key: eventId }
  const [selected, setSelected] = useState(null);
  const [partnerProfiles, setPartnerProfiles] = useState({});
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

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
          const {data:pp, error: ppError} = await supabase.from('user_profiles_public').select('user_email,display_name,avatar_url').in('user_email',emails);
          if (ppError) { toast.error(lang==='cs'?'Nepodařilo se načíst profily.':'Failed to load profiles.'); setLoading(false); return; }
          const m={}; (pp||[]).forEach(p=>m[p.user_email]=p); setPartnerProfiles(m);
        }
      });

    // event_group_messages' own RLS already limits this to chats the user is
    // an organizer or joined participant of — no separate "which events am I
    // in" lookup needed first.
    supabase.from('event_group_messages').select('*, events(title, organizer_id)').order('created_at',{ascending:false}).limit(300)
      .then(({data, error}) => {
        if (error) { toast.error(lang==='cs'?'Nepodařilo se načíst skupinové chaty.':'Failed to load group chats.'); setLoading(false); return; }
        setGroupMessages(data||[]);
        const gm = {};
        (data||[]).forEach(m => { if (m.events) gm[m.event_id] = { title: m.events.title, organizerId: m.events.organizer_id }; });
        setGroupMeta(prev => ({ ...gm, ...prev }));
        setLoading(false);
      });

    const ch = supabase.channel(`dm-page-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},p=>{
        const msg=p.new;
        if (msg.from_email===user.email||msg.to_email===user.email)
          setMessages(prev=>prev.find(m=>m.id===msg.id)?prev:[msg,...prev]);
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'direct_messages'},p=>setMessages(prev=>prev.map(m=>m.id===p.new.id?p.new:m)))
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'event_group_messages'},p=>{
        const msg=p.new;
        setGroupMessages(prev=>prev.find(m=>m.id===msg.id)?prev:[msg,...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [selected, messages.length, groupMessages.length]);

  const threads = (() => {
    if (!user) return [];
    const map = {};
    messages.forEach(msg => {
      const partner = msg.from_email===user.email?msg.to_email:msg.from_email;
      if (!map[partner]) map[partner]={partnerEmail:partner,messages:[],unread:0};
      map[partner].messages.push(msg);
      if (msg.to_email===user.email&&!msg.is_read) map[partner].unread++;
    });
    return Object.values(map);
  })();

  const groupThreads = (() => {
    const map = {};
    groupMessages.forEach(msg => {
      if (!map[msg.event_id]) map[msg.event_id] = { eventId: msg.event_id, messages: [] };
      map[msg.event_id].messages.push(msg);
    });
    return Object.values(map);
  })();

  // One combined, time-sorted inbox — a group chat is just another thread.
  const allThreads = [
    ...threads.map(t => ({ kind: 'dm', key: t.partnerEmail, last: t.messages[0], unread: t.unread })),
    ...groupThreads.map(t => ({ kind: 'group', key: t.eventId, last: t.messages[0], unread: 0 })),
  ].sort((a,b) => (b.last?.created_at||'').localeCompare(a.last?.created_at||''));

  const threadMessages = (() => {
    if (!selected) return [];
    if (selected.type === 'dm') {
      return messages.filter(m=>m.from_email===selected.key||m.to_email===selected.key)
        .sort((a,b)=>a.created_at.localeCompare(b.created_at))
        .map(m => ({
          id: m.id, mine: m.from_email===user.email, content: m.content, created_at: m.created_at,
          authorName: m.from_email===user.email ? (profile?.display_name||user.email) : pName(m.from_email),
          eventTag: m.event_title ? { title: m.event_title, isBroadcast: m.is_broadcast, eventId: m.event_id } : null,
        }));
    }
    return groupMessages.filter(m=>m.event_id===selected.key)
      .sort((a,b)=>a.created_at.localeCompare(b.created_at))
      .map(m => ({
        id: m.id, mine: m.author_id===user.id, content: m.content, created_at: m.created_at,
        authorName: m.author_id===user.id ? (profile?.display_name||user.email) : (m.author_name||m.author_email),
        eventTag: null,
      }));
  })();

  const openThread = async (email) => {
    setSelected({ type: 'dm', key: email });
    const unreadIds = messages.filter(m=>m.from_email===email&&m.to_email===user.email&&!m.is_read).map(m=>m.id);
    if (unreadIds.length) {
      const { error } = await supabase.from('direct_messages').update({is_read:true}).in('id',unreadIds);
      if (error) { toast.error(lang==='cs'?'Nepodařilo se označit zprávy jako přečtené.':'Failed to mark messages as read.'); return; }
      setMessages(prev=>prev.map(m=>unreadIds.includes(m.id)?{...m,is_read:true}:m));
    }
  };

  const openGroupThread = async (eventId) => {
    setSelected({ type: 'group', key: eventId });
    if (!groupMeta[eventId]) {
      const { data } = await supabase.from('events').select('title, organizer_id').eq('id', eventId).maybeSingle();
      if (data) setGroupMeta(prev => ({ ...prev, [eventId]: { title: data.title, organizerId: data.organizer_id } }));
    }
  };

  // Deep-link from a notification: ?with=email opens a DM, ?group=eventId
  // opens (or founds) a group chat. A "new message" notification used to
  // just open the event page, or do nothing at all if it wasn't tied to
  // one, which is most DMs.
  useEffect(() => {
    if (loading || selected) return;
    const withEmail = searchParams.get('with');
    const groupId = searchParams.get('group');
    if (withEmail && threads.some(t => t.partnerEmail === withEmail)) { openThread(withEmail); return; }
    if (groupId) openGroupThread(groupId);
  }, [loading, searchParams, threads]);

  // The organizer must send the first message in a group chat (enforced by
  // RLS too — this just avoids showing a composer that would fail).
  const isGroupFounded = selected?.type === 'group' && groupMessages.some(m => m.event_id === selected.key);
  const isSelectedGroupOrganizer = selected?.type === 'group' && groupMeta[selected.key]?.organizerId === user?.id;
  const canSend = selected?.type === 'dm' || isGroupFounded || isSelectedGroupOrganizer;

  const handleSend = async () => {
    if (!reply.trim()||!selected||sending||!canSend) return;
    setSending(true);
    const content=reply.trim(); setReply('');
    try {
      if (selected.type === 'dm') {
        const { data: toProfile } = await supabase.from('user_profiles_public').select('user_id').eq('user_email',selected.key).maybeSingle();
        const { error } = await supabase.from('direct_messages').insert({from_id:user.id,from_email:user.email,from_name:profile?.display_name||user.email,from_avatar:profile?.avatar_url||null,to_id:toProfile?.user_id||null,to_email:selected.key,content,is_read:false});
        if (error) throw error;
      } else {
        const { error } = await supabase.from('event_group_messages').insert({event_id:selected.key,author_id:user.id,author_email:user.email,author_name:profile?.display_name||user.email,author_avatar:profile?.avatar_url||null,content});
        if (error) throw error;
      }
    } catch {
      toast.error(lang==='cs'?'Zprávu se nepodařilo odeslat.':'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  function pName(email) { return partnerProfiles[email]?.display_name||email; }

  if (!user && !userLoading) return null;
  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/></div>;

  const selectedTitle = !selected ? tr.messages
    : selected.type === 'dm' ? pName(selected.key)
    : (lang==='cs'?'Skupinový chat':'Group chat') + (groupMeta[selected.key]?.title ? ` · ${groupMeta[selected.key].title}` : '');

  // dvh (not vh) so iOS Safari's collapsing URL bar doesn't push the composer
  // off-screen; subtracts the layout's top nav + bottom nav padding.
  return (
    <div className="flex flex-col h-[calc(100dvh-136px)] xl:h-[calc(100dvh-72px)] pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div className="flex items-center gap-3 mb-4">
        {selected&&<button onClick={()=>setSelected(null)} style={{ color: 'var(--sv-meta)' }}><ArrowLeft className="w-4 h-4"/></button>}
        <h1 style={svPageTitle}>{selectedTitle}</h1>
      </div>

      {!selected ? (
        <div className="space-y-1">
          {allThreads.length===0 ? (
            <EmptyState title={lang==='cs'?'Žádné zprávy':'No messages'} note={lang==='cs'?'Napiš někomu z události!':'Send a message from an event!'} />
          ) : allThreads.map(t=>{
            const last=t.last;
            const isGroup = t.kind === 'group';
            const title = isGroup ? (groupMeta[t.key]?.title || (lang==='cs'?'Skupinový chat':'Group chat')) : pName(t.key);
            return (
              <button key={`${t.kind}-${t.key}`} onClick={()=>isGroup?openGroupThread(t.key):openThread(t.key)} className="w-full flex items-center gap-3 text-left transition-colors" style={{ padding: 12, borderRadius: 14 }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isGroup ? 'var(--sv-action-bg)' : 'var(--sv-brand-purple-bg)', color: isGroup ? 'var(--sv-action-ink)' : 'var(--sv-brand-purple)' }}>
                  {isGroup ? <SvIcon name="users" size={16}/> : <span style={{ font: "500 14px 'Outfit', sans-serif" }}>{title[0]?.toUpperCase()||'?'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><span style={{ font: `${t.unread>0?500:400} 12.5px 'Outfit', sans-serif`, color: 'var(--sv-ink)' }}>{title}</span>{last&&<span style={{ font: "400 10.5px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)' }}>{format(new Date(last.created_at),'HH:mm')}</span>}</div>
                  {!isGroup && last?.event_title && (
                    <p className="truncate" style={{ font: "500 10.5px 'Outfit', sans-serif", color: 'var(--sv-brand-purple)', marginTop: 1 }}>
                      {last.is_broadcast ? (lang==='cs'?'Zpráva organizátora':'Organizer message') : (lang==='cs'?'K akci':'About event')} · {last.event_title}
                    </p>
                  )}
                  {isGroup && <p className="truncate" style={{ font: "500 10.5px 'Outfit', sans-serif", color: 'var(--sv-action-ink)', marginTop: 1 }}>{lang==='cs'?'Skupinový chat':'Group chat'}</p>}
                  <div className="flex items-center justify-between"><p className="truncate max-w-[200px]" style={{ font: "300 12px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>{last?.content||''}</p>{t.unread>0&&<span className="flex items-center justify-center flex-shrink-0" style={{ minWidth: 17, height: 17, borderRadius: 999, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', font: "500 10.5px 'Outfit', sans-serif", padding: '0 4px' }}>{t.unread}</span>}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden" style={svCard}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selected.type === 'group' && groupMeta[selected.key]?.title && (
              <Link to={`/event/${selected.key}`} className="flex items-center self-start" style={{ gap: 4, font: "500 10.5px 'Outfit', sans-serif", color: 'var(--sv-action-ink)', background: 'var(--sv-action-bg)', borderRadius: 'var(--sv-r-pill)', padding: '3px 9px', marginBottom: 4 }}>
                <SvIcon name="calendar" size={9}/>{groupMeta[selected.key].title}
              </Link>
            )}
            {threadMessages.length===0 && selected.type==='group' && (
              <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-meta)', textAlign: 'center', marginTop: 20 }}>
                {isSelectedGroupOrganizer
                  ? (lang==='cs' ? 'Napiš první zprávu a založ tím skupinový chat pro všechny účastníky.' : "Send the first message to found the group chat for all participants.")
                  : (lang==='cs' ? 'Organizátor zatím skupinový chat nezaložil.' : "The organizer hasn't started the group chat yet.")}
              </p>
            )}
            {threadMessages.map(msg=>(
              <div key={msg.id} className={`flex flex-col ${msg.mine?'items-end':'items-start'}`} style={{ gap: 4 }}>
                {msg.eventTag && (
                  <Link to={`/event/${msg.eventTag.eventId}`} className="flex items-center" style={{ gap: 4, font: "500 10.5px 'Outfit', sans-serif", color: 'var(--sv-brand-purple)', background: 'var(--sv-brand-purple-bg)', borderRadius: 'var(--sv-r-pill)', padding: '3px 9px' }}>
                    <SvIcon name="calendar" size={9}/>
                    {msg.eventTag.isBroadcast ? (lang==='cs'?'Zpráva organizátora':'Organizer message') : (lang==='cs'?'K akci':'About event')} · {msg.eventTag.title}
                  </Link>
                )}
                <div className={`flex gap-2 ${msg.mine?'flex-row-reverse':''}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: msg.mine ? 'var(--sv-brand-purple-bg)' : 'var(--sv-surface-muted)', color: msg.mine ? 'var(--sv-brand-purple)' : 'var(--sv-ink-soft)', font: "500 11.5px 'Outfit', sans-serif" }}>{msg.authorName[0]?.toUpperCase()}</div>
                  <div className="max-w-[70%] flex flex-col" style={{ alignItems: msg.mine?'flex-end':'flex-start' }}>
                    {!msg.mine && selected.type==='group' && <span style={{ font: "500 10px 'Outfit', sans-serif", color: 'var(--sv-meta)', marginBottom: 2 }}>{msg.authorName}</span>}
                    <div style={{ padding: '8px 12px', borderRadius: 14, font: "300 13.5px 'Outfit', sans-serif", background: msg.mine ? 'var(--sv-action-bg)' : 'var(--sv-surface-muted)', color: msg.mine ? 'var(--sv-action-ink)' : 'var(--sv-ink-soft)' }}>{msg.content}</div>
                    <span style={{ font: "400 10.5px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)', marginTop: 3 }}>{format(new Date(msg.created_at),'HH:mm')}</span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          {canSend && (
            <div className="flex gap-2 p-3" style={{ borderTop: '1px solid var(--sv-hairline)' }}>
              <Textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder={lang === 'cs' ? 'Napiš zprávu...' : 'Write a message...'} className="min-h-[40px] max-h-[120px] resize-none" style={svField} rows={1}/>
              <button onClick={handleSend} disabled={sending||!reply.trim()} className="flex items-center justify-center self-end flex-shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', opacity: (sending||!reply.trim())?0.5:1 }}>{sending?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

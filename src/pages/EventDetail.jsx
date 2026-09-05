import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { ArrowLeft, Flag, Send, Crown, Pencil, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { useT } from '@/lib/i18n';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import AttendanceMarker from '@/components/events/AttendanceMarker';
import ParticipantsPanel from '@/components/events/ParticipantsPanel';
import ReportModal from '@/components/events/ReportModal';
import PremiumModal from '@/components/premium/PremiumModal';
import AddToCalendar from '@/components/events/AddToCalendar';
import EditEventModal from '@/components/events/EditEventModal';
import SendDMModal from '@/components/messages/SendDMModal';
import ShareEventButton from '@/components/events/ShareEventButton';
import { usePageMeta } from '@/hooks/usePageMeta';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { SvIcon } from '@/components/icons/SvIcon';
import { svCard, svField, svSectionLabel, svMeta } from '@/lib/svStyles';

const ghostIcon = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, color: 'var(--sv-meta)' };
const infoTile = { background: 'var(--sv-surface-muted)', borderRadius: 10, padding: '10px 12px' };

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { lang } = useContext(LanguageContext);
  const tr = useT();
  const { user, profile, updateProfile } = useCurrentUser();

  useEffect(() => { window.scrollTo(0,0); }, [id]);
  const [event, setEvent] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [joinAnim, setJoinAnim] = useState(false);
  const [joiningEvent, setJoiningEvent] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [showPremium, setShowPremium] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDM, setShowDM] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const favRef = useRef(new Set());

  usePageMeta({ title: event ? `${event.title} | Spoluvíc` : 'Spoluvíc', description: event?.description || '' });

  useEffect(() => {
    supabase.from('events').select('*').eq('id', id).single().then(({data, error}) => {
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se načíst událost.' : 'Failed to load event.'); return; }
      setEvent(data);
      if (data?.participants?.length) {
        supabase.from('user_profiles').select('user_email,display_name,avatar_url,subscription_plan,is_premium,is_verified,reliability_score,noshow_count')
          .in('user_email', data.participants)
          .then(({data:pp, error:ppError}) => {
            if (ppError) { toast.error(lang === 'cs' ? 'Nepodařilo se načíst účastníky.' : 'Failed to load participants.'); return; }
            const m={}; (pp||[]).forEach(p => m[p.user_email]=p); setParticipantProfiles(m);
          });
      }
    });
    supabase.from('comments').select('*').eq('event_id', id).order('created_at',{ascending:true}).limit(50).then(({data, error}) => {
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se načíst komentáře.' : 'Failed to load comments.'); return; }
      setComments(data||[]);
    });

    const ch = supabase.channel(`comments-${id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `event_id=eq.${id}` },
        p => setComments(prev => prev.find(c => c.id === p.new.id) ? prev : [...prev, p.new]))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [id]);

  const isJoined = user && event?.participants?.includes(user.email);
  const isOnWaitlist = user && event?.waitlist?.includes(user.email);
  const isFav = profile?.favorited_events?.includes(id);
  const isFull = event?.max_capacity && (event?.participants?.length||0) >= event.max_capacity;
  const isOrganizer = user && event?.organizer_email === user.email;
  const isAdmin = profile?.is_admin;
  const canEdit = isOrganizer || isAdmin;

  const canJoin = () => {
    if (!profile) return true;
    if (profile.is_premium || ['plus','creator'].includes(profile.subscription_plan)) return true;
    const now=new Date(); const reset=profile.monthly_reset_date?new Date(profile.monthly_reset_date):null;
    const isNew=!reset||now.getFullYear()>reset.getFullYear()||now.getMonth()>reset.getMonth();
    return (isNew?0:profile.monthly_join_count||0) < 3;
  };

  const handleJoin = async (skipConfirm=false) => {
    if (!user||!event||joiningEvent) return;
    if ((isJoined||isOnWaitlist) && !skipConfirm) { setLeaveConfirm(true); return; }
    if (!isJoined&&!isOnWaitlist&&!canJoin()) { setShowPremium(true); return; }
    setJoinAnim(true); setTimeout(()=>setJoinAnim(false),600);
    const action = isJoined?'leave':isOnWaitlist?'leave_waitlist':isFull?'join_waitlist':'join';
    setJoiningEvent(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-event', { body: { event_id: event.id, action } });
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se změnit účast.' : 'Failed to update attendance.'); return; }
      if (data?.error === 'monthly_limit_reached') { setShowPremium(true); return; }
      if (data?.event) setEvent(data.event);
    } finally { setJoiningEvent(false); }
  };

  const handleFavorite = async () => {
    if (favRef.current.has(id)) return;
    favRef.current.add(id);
    try {
      if (!user||!profile) return;
      const updated = isFav ? (profile.favorited_events||[]).filter(i=>i!==id) : [...(profile.favorited_events||[]),id];
      await updateProfile({ favorited_events: updated });
    } catch {
      toast.error(lang === 'cs' ? 'Nepodařilo se uložit oblíbenou položku.' : 'Failed to update favorite.');
    } finally { favRef.current.delete(id); }
  };

  const handleComment = async () => {
    if (!newComment.trim()||!user||submittingComment) return;
    setSubmittingComment(true);
    try {
      const {data:comment, error} = await supabase.from('comments').insert({ event_id:id, author_id:user.id, author_email:user.email, author_name:profile?.display_name||user.email, author_avatar:profile?.avatar_url||null, content:newComment.trim() }).select().single();
      if (error) { toast.error(lang === 'cs' ? 'Nepodařilo se přidat komentář.' : 'Failed to add comment.'); return; }
      if (comment) { setComments(prev=>[...prev,comment]); setNewComment(''); }
      const { error: updateError } = await supabase.from('events').update({comments_count:(event.comments_count||0)+1}).eq('id',id);
      if (updateError) { toast.error(lang === 'cs' ? 'Nepodařilo se aktualizovat počet komentářů.' : 'Failed to update comment count.'); return; }
      setEvent(e=>({...e,comments_count:(e.comments_count||0)+1}));
    } finally { setSubmittingComment(false); }
  };

  if (!event) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--sv-hairline)', borderTopColor: 'var(--sv-brand-purple)' }}/></div>;

  const cat = getCategoryStyle(event.category);

  const joinLabel = isJoined ? (lang==='cs'?'Jdu (odhlásit)':'Going (leave)')
    : isOnWaitlist ? (lang==='cs'?'Na čekačce (odhlásit)':'On waitlist (leave)')
    : isFull ? (lang==='cs'?'Přidat na čekačku':'Join waitlist')
    : (lang==='cs'?'Chci jít!':"I'm in!");
  const joinStyle = isJoined || isOnWaitlist
    ? { background: 'var(--sv-action-bg-quiet)', color: 'var(--sv-action-ink-quiet)' }
    : { background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)' };

  return (
    <div className="max-w-2xl mx-auto pt-2" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <button onClick={()=>{ if (window.history.length > 1) navigate(-1); else navigate('/'); }} className="flex items-center gap-2 mb-4 transition-colors" style={{ ...svMeta, fontWeight: 400 }}><ArrowLeft className="w-3.5 h-3.5"/>{tr.createBack}</button>

      <div style={{ ...svCard, overflow: 'hidden' }}>
        {event.image_url && <div className="h-56 overflow-hidden"><img src={event.image_url} alt={event.title} className="w-full h-full object-cover"/></div>}
        <div style={{ padding: 22 }}>
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <div className="flex-1">
              <span className="inline-flex items-center mb-2" style={{ gap: 5, background: cat.bg, color: cat.ink, borderRadius: 'var(--sv-r-pill)', padding: '3px 9px', font: "400 10.5px 'Outfit', sans-serif" }}>
                <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 11 }}>{cat.emoji}</span>{getCategoryLabel(event.category,lang)}
              </span>
              <h1 style={{ font: "500 20px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)' }}>{event.title}</h1>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {canEdit && <button onClick={()=>setShowEdit(true)} style={ghostIcon}><Pencil className="w-4 h-4"/></button>}
              <button onClick={handleFavorite} style={ghostIcon}>
                <SvIcon name="star" size={16} style={{ color: isFav ? 'var(--sv-brand-orange)' : 'var(--sv-meta)' }}/>
              </button>
            </div>
          </div>

          {event.description && <p style={{ font: "300 13.5px 'Outfit', sans-serif", lineHeight: 1.6, color: 'var(--sv-ink-soft)', marginBottom: 18 }}>{event.description}</p>}

          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div style={infoTile}><p style={svMeta}>{tr.detailLocation}</p><p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)', marginTop: 2 }}>{event.location}</p></div>
            <div style={infoTile}><p style={svMeta}>{tr.detailDateTime}</p><p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)', marginTop: 2 }}>{format(new Date(event.date),'EEEEEE d. MMM · HH:mm', { locale: cs })}</p></div>
            <div style={infoTile}><p style={svMeta}>{tr.detailPeople}</p><p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)', marginTop: 2 }}>{event.participants?.length||0}{event.max_capacity?`/${event.max_capacity}`:''} {tr.detailGoing}</p></div>
            <div style={infoTile}><p style={svMeta}>{tr.detailOrganizer}</p><p style={{ font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)', marginTop: 2 }}>{event.organizer_name||tr.detailAnonymous}</p></div>
          </div>

          <div className="flex gap-2 mb-3.5">
            <div className="flex-1"><AddToCalendar event={event}/></div>
            <ShareEventButton event={event}/>
            {user && !isOrganizer && event.organizer_email && (
              <button onClick={()=>setShowDM(true)} className="flex items-center justify-center" style={{ width: 36, borderRadius: 10, background: '#F0EAFC', color: 'var(--sv-brand-purple)' }}>
                <Send className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>

          {(isOrganizer || event.participants?.length > 0) && (
            <button type="button" onClick={()=>setParticipantsOpen(true)} className="w-full text-left transition-colors" style={{ marginBottom: 18 }}>
              <p style={{ ...svSectionLabel, marginBottom: 8 }}>{tr.detailGoing} ({event.participants?.length||0})</p>
              {event.participants?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {event.participants.slice(0,12).map((email,i) => {
                    const pp = participantProfiles[email];
                    const isCreator = pp?.subscription_plan==='creator'||(pp?.is_premium&&pp?.is_verified);
                    const style = isCreator?{boxShadow:'0 0 0 2px var(--sv-brand-orange), 0 0 0 4px var(--sv-brand-purple)'}:{};
                    return pp?.avatar_url
                      ? <img key={i} src={pp.avatar_url} alt={pp.display_name||email} title={pp.display_name||email} className="w-8 h-8 rounded-full object-cover" style={{ border: '2px solid var(--sv-surface)', ...style }}/>
                      : <div key={i} title={email} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#F0EAFC', color: 'var(--sv-brand-purple)', font: "500 11px 'Outfit', sans-serif", ...style }}>{email[0].toUpperCase()}</div>;
                  })}
                  {event.participants.length>12 && <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--sv-surface-muted)', color: 'var(--sv-meta)', font: "400 10.5px 'Outfit', sans-serif" }}>+{event.participants.length-12}</div>}
                </div>
              ) : (
                <p style={svMeta}>{tr.noParticipants}</p>
              )}
            </button>
          )}

          <ParticipantsPanel event={event} isOrganizer={isOrganizer} open={participantsOpen} onClose={()=>setParticipantsOpen(false)} onEventUpdate={setEvent}/>

          {profile&&!profile.is_premium&&profile.subscription_plan!=='plus'&&profile.subscription_plan!=='creator'&&!isJoined&&!isOnWaitlist&&(()=>{
            const now=new Date();const reset=profile.monthly_reset_date?new Date(profile.monthly_reset_date):null;
            const isNew=!reset||now.getFullYear()>reset.getFullYear()||now.getMonth()>reset.getMonth();
            const remaining=3-(isNew?0:profile.monthly_join_count||0);
            if (remaining<=1&&remaining>0) return (
              <button onClick={()=>setShowPremium(true)} className="w-full mb-3 flex items-center gap-2 transition-colors" style={{ background: 'var(--sv-surface-muted)', borderRadius: 10, padding: '8px 12px', font: "400 11.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>
                <Crown className="w-3.5 h-3.5" style={{ color: 'var(--sv-brand-orange)' }}/>
                {lang === 'cs' ? `Zbývá ${remaining} volné zúčastnění · Upgrade na Plus →` : `${remaining} free join${remaining===1?'':'s'} left · Upgrade to Plus →`}
              </button>
            );
            return null;
          })()}

          <div className="flex gap-3">
            <motion.button animate={joinAnim?{scale:[1,1.2,0.95,1.05,1]}:{}} onClick={handleJoin} disabled={joiningEvent}
              className="flex-1 flex items-center justify-center transition-all disabled:opacity-70"
              style={{ ...joinStyle, padding: '13px 0', borderRadius: 'var(--sv-r-pill)', font: "500 13.5px 'Outfit', sans-serif" }}>
              {joiningEvent ? <Loader2 className="w-4 h-4 animate-spin"/> : joinLabel}
            </motion.button>
            <button onClick={()=>setReportOpen(true)} className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: 'var(--sv-r-pill)', background: 'var(--sv-surface-muted)', color: 'var(--sv-meta)' }}><Flag className="w-4 h-4"/></button>
          </div>

          <ReportModal eventId={id} eventTitle={event?.title} user={user} open={reportOpen} onClose={()=>setReportOpen(false)}/>
          {showEdit && <EditEventModal event={event} open={showEdit} onClose={()=>setShowEdit(false)} onSaved={updated=>setEvent(updated)}/>}
          <PremiumModal open={showPremium} onClose={()=>setShowPremium(false)} profile={profile} onUpgrade={u=>updateProfile(u)}/>
          <ConfirmDialog open={leaveConfirm} onConfirm={()=>{setLeaveConfirm(false);handleJoin(true);}} onCancel={()=>setLeaveConfirm(false)} title={isOnWaitlist?(lang==='cs'?'Odhlásit se z čekačky?':'Leave waitlist?'):(lang==='cs'?'Zrušit účast?':'Cancel attendance?')} description={lang==='cs'?`Opravdu chceš opustit akci „${event?.title}"?`:`Are you sure you want to leave "${event?.title}"?`} confirmLabel={isOnWaitlist?(lang==='cs'?'Odhlásit z čekačky':'Leave waitlist'):(lang==='cs'?'Zrušit účast':'Cancel')} destructive/>
          {showDM && <SendDMModal open={showDM} onClose={()=>setShowDM(false)} toEmail={event.organizer_email} toName={event.organizer_name||event.organizer_email} fromUser={user} fromProfile={profile} event={event}/>}
        </div>
      </div>

      <AttendanceMarker event={event} onMarked={() => {}}/>

      <div className="mt-4" style={{ ...svCard, padding: 18 }}>
        <h2 style={{ font: "500 15px 'Outfit', sans-serif", color: 'var(--sv-ink)', marginBottom: 14 }}>{tr.detailDiscussion} ({comments.length})</h2>
        {user && <div className="flex gap-3 mb-4">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: '#F0EAFC', color: 'var(--sv-brand-purple)', font: "500 11px 'Outfit', sans-serif" }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover"/>
              : <span>{(profile?.display_name||user.email)?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="flex-1">
            <Textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder={tr.detailCommentPlaceholder} className="resize-none min-h-[80px]" style={svField}/>
            <div className="flex justify-end mt-2">
              <button onClick={handleComment} disabled={submittingComment||!newComment.trim()} className="flex items-center gap-1.5" style={{ background: 'var(--sv-action-bg)', color: 'var(--sv-action-ink)', borderRadius: 'var(--sv-r-pill)', padding: '7px 14px', font: "500 12px 'Outfit', sans-serif", opacity: (submittingComment||!newComment.trim())?0.5:1 }}>
                {submittingComment?<Loader2 className="w-3 h-3 animate-spin"/>:<Send className="w-3 h-3"/>} {tr.detailCommentBtn}
              </button>
            </div>
          </div>
        </div>}
        <div className="space-y-3.5">
          {comments.map(c=>(
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--sv-surface-muted)', color: 'var(--sv-ink-soft)', font: "500 11px 'Outfit', sans-serif" }} title={c.author_name}>
                {c.author_avatar?<img src={c.author_avatar} alt={c.author_name} className="w-full h-full object-cover"/>:(c.author_name?.[0]||'?')}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span style={{ font: "500 12px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>{c.author_name}</span>
                  <span style={svMeta}>{format(new Date(c.created_at),'d. MMM, HH:mm', { locale: cs })}</span>
                </div>
                <p style={{ font: "300 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)', lineHeight: 1.5, marginTop: 2 }}>{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length===0&&<p style={{ ...svMeta, textAlign: 'center', padding: '16px 0' }}>{tr.detailNoComments}</p>}
        </div>
      </div>
    </div>
  );
}

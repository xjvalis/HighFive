import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { ArrowLeft, Star, Flag, Send, Crown, Pencil, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import EventChat from '@/components/events/EventChat';
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

  if (!event) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-lavender border-t-violet-500 rounded-full animate-spin"/></div>;

  const cat = getCategoryStyle(event.category);

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={()=>{ if (window.history.length > 1) navigate(-1); else navigate('/'); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"><ArrowLeft className="w-4 h-4"/>{tr.createBack}</button>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        {event.image_url && <div className="h-56 overflow-hidden"><img src={event.image_url} alt={event.title} className="w-full h-full object-cover"/></div>}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mb-2 inline-block',cat.color)}>{cat.emoji} {getCategoryLabel(event.category,lang)}</span>
              <h1 className="font-grotesk font-bold text-2xl">{event.title}</h1>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && <button onClick={()=>setShowEdit(true)} className="p-2 rounded-xl hover:bg-secondary transition-colors"><Pencil className="w-4 h-4 text-muted-foreground"/></button>}
              <button onClick={handleFavorite} className="p-2 rounded-xl hover:bg-secondary transition-colors"><Star className={cn('w-5 h-5',isFav?'fill-yellow-500 text-yellow-500':'text-muted-foreground')}/></button>
            </div>
          </div>

          {event.description && <p className="text-foreground/80 leading-relaxed mb-5">{event.description}</p>}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-secondary/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">{tr.detailLocation}</p><p className="text-sm font-medium">{event.location}</p></div>
            <div className="bg-secondary/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">{tr.detailDateTime}</p><p className="text-sm font-medium">{format(new Date(event.date),'EEEEEE d. MMM · HH:mm', { locale: cs })}</p></div>
            <div className="bg-secondary/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">{tr.detailPeople}</p><p className="text-sm font-medium">{event.participants?.length||0}{event.max_capacity?`/${event.max_capacity}`:''} {tr.detailGoing}</p></div>
            <div className="bg-secondary/50 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">{tr.detailOrganizer}</p><p className="text-sm font-medium">{event.organizer_name||tr.detailAnonymous}</p></div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1"><AddToCalendar event={event}/></div>
            <ShareEventButton event={event}/>
            {user && !isOrganizer && event.organizer_email && <button onClick={()=>setShowDM(true)} className="flex items-center gap-2 text-xs font-medium text-primary bg-lavender/60 hover:bg-lavender px-2.5 py-2 rounded-xl transition-colors"><Send className="w-3.5 h-3.5"/></button>}
          </div>

          {(isOrganizer || event.participants?.length > 0) && (
            <button type="button" onClick={()=>setParticipantsOpen(true)} className="w-full text-left mb-5 rounded-xl -mx-1 px-1 py-1 hover:bg-secondary/40 transition-colors">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{tr.detailGoing} ({event.participants?.length||0})</p>
              {event.participants?.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {event.participants.slice(0,12).map((email,i) => {
                    const pp = participantProfiles[email];
                    const isCreator = pp?.subscription_plan==='creator'||(pp?.is_premium&&pp?.is_verified);
                    const style = isCreator?{boxShadow:'0 0 0 2px #FFD700, 0 0 0 4px #FFA500'}:{};
                    return pp?.avatar_url
                      ? <img key={i} src={pp.avatar_url} alt={pp.display_name||email} title={pp.display_name||email} className="w-8 h-8 rounded-full object-cover border-2 border-card" style={style}/>
                      : <div key={i} title={email} className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold" style={style}>{email[0].toUpperCase()}</div>;
                  })}
                  {event.participants.length>12 && <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">+{event.participants.length-12}</div>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{tr.noParticipants}</p>
              )}
            </button>
          )}

          <ParticipantsPanel event={event} isOrganizer={isOrganizer} open={participantsOpen} onClose={()=>setParticipantsOpen(false)} onEventUpdate={setEvent}/>

          {profile&&!profile.is_premium&&profile.subscription_plan!=='plus'&&profile.subscription_plan!=='creator'&&!isJoined&&!isOnWaitlist&&(()=>{
            const now=new Date();const reset=profile.monthly_reset_date?new Date(profile.monthly_reset_date):null;
            const isNew=!reset||now.getFullYear()>reset.getFullYear()||now.getMonth()>reset.getMonth();
            const remaining=3-(isNew?0:profile.monthly_join_count||0);
            if (remaining<=1&&remaining>0) return <button onClick={()=>setShowPremium(true)} className="w-full mb-3 flex items-center gap-2 bg-lemon/60 rounded-xl px-3 py-2 text-xs text-yellow-700 hover:bg-lemon transition-colors"><Crown className="w-3.5 h-3.5"/>{lang === 'cs' ? `Zbývá ${remaining} volné zúčastnění · Upgrade na Plus →` : `${remaining} free join${remaining===1?'':'s'} left · Upgrade to Plus →`}</button>;
            return null;
          })()}

          <div className="flex gap-3">
            <motion.button animate={joinAnim?{scale:[1,1.2,0.95,1.05,1]}:{}} onClick={handleJoin} disabled={joiningEvent}
              className={cn('flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-70',
                isJoined?'bg-mint text-emerald-700 hover:bg-red-50 hover:text-red-600':isOnWaitlist?'bg-lemon text-yellow-700 hover:bg-red-50 hover:text-red-600':isFull?'bg-secondary text-muted-foreground hover:bg-orange-50 hover:text-orange-700':'bg-primary text-primary-foreground hover:bg-primary/90')}>
              {joiningEvent?<Loader2 className="w-4 h-4 animate-spin"/>:<><span className="text-lg">{isJoined?'✓':isOnWaitlist?'⏳':isFull?'📋':'🙌'}</span>{isJoined?(lang==='cs'?'Jdu! (odhlásit)':'Going! (leave)'):isOnWaitlist?(lang==='cs'?'Na čekačce (odhlásit)':'On waitlist (leave)'):isFull?(lang==='cs'?'Přidat na čekačku':'Join waitlist'):(lang==='cs'?'Chci jít!':"I'm in!")}</>}
            </motion.button>
            <Button variant="outline" size="icon" className="rounded-2xl w-12 h-12" onClick={()=>setReportOpen(true)}><Flag className="w-4 h-4 text-muted-foreground"/></Button>
          </div>

          <ReportModal eventId={id} eventTitle={event?.title} user={user} open={reportOpen} onClose={()=>setReportOpen(false)}/>
          {showEdit && <EditEventModal event={event} open={showEdit} onClose={()=>setShowEdit(false)} onSaved={updated=>setEvent(updated)}/>}
          <PremiumModal open={showPremium} onClose={()=>setShowPremium(false)} profile={profile} onUpgrade={u=>updateProfile(u)}/>
          <ConfirmDialog open={leaveConfirm} onConfirm={()=>{setLeaveConfirm(false);handleJoin(true);}} onCancel={()=>setLeaveConfirm(false)} title={isOnWaitlist?(lang==='cs'?'Odhlásit se z čekačky?':'Leave waitlist?'):(lang==='cs'?'Zrušit účast?':'Cancel attendance?')} description={lang==='cs'?`Opravdu chceš opustit akci „${event?.title}"?`:`Are you sure you want to leave "${event?.title}"?`} confirmLabel={isOnWaitlist?(lang==='cs'?'Odhlásit z čekačky':'Leave waitlist'):(lang==='cs'?'Zrušit účast':'Cancel')} destructive/>
          {showDM && <SendDMModal open={showDM} onClose={()=>setShowDM(false)} toEmail={event.organizer_email} toName={event.organizer_name||event.organizer_email} fromUser={user} fromProfile={profile} event={event}/>}
        </div>
      </div>

      <AttendanceMarker event={event} onMarked={() => {}}/>
      <EventChat event={event} user={user} profile={profile}/>

      <div className="mt-5 bg-card rounded-2xl border border-border/60 shadow-sm p-5">
        <h2 className="font-grotesk font-semibold text-base mb-4">{tr.detailDiscussion} ({comments.length})</h2>
        {user && <div className="flex gap-3 mb-5">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-lavender flex items-center justify-center text-violet-700 text-xs font-bold">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover"/>
              : <span>{(profile?.display_name||user.email)?.[0]?.toUpperCase()}</span>
            }
          </div>
          <div className="flex-1">
            <Textarea value={newComment} onChange={e=>setNewComment(e.target.value)} placeholder={tr.detailCommentPlaceholder} className="resize-none text-sm rounded-xl border-border/60 min-h-[80px]"/>
            <div className="flex justify-end mt-2">
              <Button onClick={handleComment} size="sm" disabled={submittingComment||!newComment.trim()} className="rounded-xl gap-1.5">
                {submittingComment?<Loader2 className="w-3 h-3 animate-spin"/>:<Send className="w-3 h-3"/>} {tr.detailCommentBtn}
              </Button>
            </div>
          </div>
        </div>}
        <div className="space-y-4">
          {comments.map(c=>(
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-peach flex items-center justify-center text-orange-700 text-xs font-bold cursor-pointer hover:ring-2 hover:ring-primary transition-all" title={c.author_name}>
                {c.author_avatar?<img src={c.author_avatar} alt={c.author_name} className="w-full h-full object-cover"/>:(c.author_name?.[0]||'?')}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold">{c.author_name}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.created_at),'d. MMM, HH:mm', { locale: cs })}</span>
                </div>
                <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length===0&&<p className="text-sm text-muted-foreground text-center py-4">{tr.detailNoComments}</p>}
        </div>
      </div>
    </div>
  );
}

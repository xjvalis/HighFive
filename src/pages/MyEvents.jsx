import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import EventCard from '@/components/events/EventCard';
import OrganizerEventCard from '@/components/myevents/OrganizerEventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from 'sonner';

export default function MyEvents() {
  const tr = useT();
  const { user, profile } = useCurrentUser();
  const [created, setCreated] = useState([]);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('going');
  const [leaveConfirm, setLeaveConfirm] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('events').select('*').eq('organizer_email',user.email).order('date',{ascending:false}),
      profile?.joined_events?.length
        ? supabase.from('events').select('*').in('id',profile.joined_events).neq('organizer_email',user.email).order('date',{ascending:true})
        : Promise.resolve({data:[]}),
    ]).then(([{data:mine},{data:joinedData}]) => {
      setCreated(mine||[]);
      setJoined(joinedData||[]);
      setLoading(false);
    });
  }, [user?.id, profile?.joined_events?.length]);

  const confirmLeave = async () => {
    const event = leaveConfirm; setLeaveConfirm(null);
    const {data} = await supabase.functions.invoke('join-event',{body:{event_id:event.id,action:'leave'}});
    if (data?.event) { setJoined(prev=>prev.filter(e=>e.id!==event.id)); toast.success('Účast zrušena.'); }
    else toast.error('Nepodařilo se zrušit účast.');
  };

  const handleWaitlistPromote = (eventId,newParticipants,newWaitlist) =>
    setCreated(prev=>prev.map(e=>e.id===eventId?{...e,participants:newParticipants,waitlist:newWaitlist}:e));

  const tabs = [{key:'going',label:`${tr.attending} (${joined.length})`},{key:'hosting',label:`${tr.hosting} (${created.length})`}];

  return (
    <div>
      <h1 className="font-grotesk font-bold text-xl mb-5">{tr.myEvents}</h1>
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-5 w-fit">
        {tabs.map(t=><button key={t.key} onClick={()=>setTab(t.key)} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',tab===t.key?'bg-card shadow-sm':'text-muted-foreground hover:text-foreground')}>{t.label}</button>)}
      </div>
      <ConfirmDialog open={!!leaveConfirm} onConfirm={confirmLeave} onCancel={()=>setLeaveConfirm(null)} title="Zrušit účast?" description={leaveConfirm?`Opravdu chceš zrušit účast na akci „${leaveConfirm.title}"?`:''} confirmLabel="Zrušit účast" destructive/>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="bg-card rounded-2xl p-4 border border-border/60"><Skeleton className="h-4 w-24 mb-3"/><Skeleton className="h-5 w-3/4 mb-2"/><Skeleton className="h-4 w-1/2"/></div>)}</div>
      ) : (
        <div className="space-y-3">
          {tab==='going' && (<>
            {joined.map(e=><EventCard key={e.id} event={e} onJoin={()=>setLeaveConfirm(e)} isJoined={true}/>)}
            {joined.length===0&&<div className="text-center py-16"><p className="text-4xl mb-3">🙌</p><p className="font-grotesk font-semibold">{tr.noAttendingEvents}</p></div>}
          </>)}
          {tab==='hosting' && (<>
            {created.map(e=><OrganizerEventCard key={e.id} event={e} onWaitlistPromote={handleWaitlistPromote}/>)}
            {created.length===0&&<div className="text-center py-16"><p className="text-4xl mb-3">📅</p><p className="font-grotesk font-semibold">{tr.noHostedEvents}</p></div>}
          </>)}
        </div>
      )}
    </div>
  );
}

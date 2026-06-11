import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Flame, Clock, Users, MessageCircle } from 'lucide-react';
import { getCategoryStyle, getCategoryLabel } from '@/lib/categories';
import { format } from 'date-fns';
import { useT } from '@/lib/i18n';
import { useContext } from 'react';
import { LanguageContext } from '@/lib/language';

export default function RightSidebar() {
  const tr = useT();
  const [hotEvents, setHotEvents] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    supabase.from('events').select('*').eq('is_approved',true).order('comments_count',{ascending:false}).limit(5).then(({data})=>setHotEvents(data||[]));
    supabase.from('events').select('*').eq('is_approved',true).order('created_at',{ascending:false}).limit(5).then(({data})=>setRecentEvents(data||[]));

    const ch = supabase.channel('sidebar-events')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'events'},p=>setRecentEvents(prev=>[p.new,...prev].slice(0,5)))
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-lavender to-sky rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-violet-700"/><span className="font-grotesk font-semibold text-sm text-violet-700">{tr.communityTitle}</span></div>
        <p className="text-xs text-violet-600/80 leading-relaxed">{tr.communityText}</p>
      </div>
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/60">
        <div className="flex items-center gap-2 mb-3"><Flame className="w-4 h-4 text-orange-500"/><span className="font-grotesk font-semibold text-sm">{tr.hotRightNow}</span></div>
        <div className="space-y-3">
          {hotEvents.map((e,i)=><HotSnippet key={e.id} event={e} rank={i+1}/>)}
          {hotEvents.length===0&&<p className="text-xs text-muted-foreground">{tr.noEventsYet}</p>}
        </div>
      </div>
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border/60">
        <div className="flex items-center gap-2 mb-3"><Clock className="w-4 h-4 text-sky-500"/><span className="font-grotesk font-semibold text-sm">{tr.justPosted}</span></div>
        <div className="space-y-3">
          {recentEvents.map(e=><RecentSnippet key={e.id} event={e}/>)}
          {recentEvents.length===0&&<p className="text-xs text-muted-foreground">{tr.noEventsYet}</p>}
        </div>
      </div>
    </div>
  );
}

function HotSnippet({ event, rank }) {
  const { lang } = useContext(LanguageContext);
  const cat = getCategoryStyle(event.category);
  return (
    <Link to={`/event/${event.id}`} className="flex gap-2 group">
      <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0 mt-0.5">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2 leading-snug">{event.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.emoji} {getCategoryLabel(event.category,lang)}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Users className="w-2.5 h-2.5"/>{event.participants?.length||0}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><MessageCircle className="w-2.5 h-2.5"/>{event.comments_count||0}</span>
        </div>
      </div>
    </Link>
  );
}

function RecentSnippet({ event }) {
  const { lang } = useContext(LanguageContext);
  const cat = getCategoryStyle(event.category);
  return (
    <Link to={`/event/${event.id}`} className="flex gap-2 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2 leading-snug">{event.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.emoji} {getCategoryLabel(event.category,lang)}</span>
          <span className="text-[10px] text-muted-foreground">{event.created_at?format(new Date(event.created_at),'HH:mm'):''}</span>
        </div>
      </div>
    </Link>
  );
}

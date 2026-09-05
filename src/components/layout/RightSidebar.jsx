import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/i18n';
import { toast } from 'sonner';

const cardStyle = { background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-card)', padding: 12 };

export default function RightSidebar() {
  const tr = useT();
  const [hotEvents, setHotEvents] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    const now = new Date().toISOString();

    supabase.from('events').select('*')
      .eq('is_approved', true)
      .gt('date', now)
      .order('hot_score', { ascending: false })
      .order('date', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (error) toast.error(tr.sidebarHotLoadFailed);
        setHotEvents(data || []);
      });

    supabase.from('events').select('*')
      .eq('is_approved', true)
      .gt('date', now)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) toast.error(tr.sidebarNewLoadFailed);
        setRecentEvents(data || []);
      });

    const ch = supabase.channel('sidebar-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' },
        p => setRecentEvents(prev => [p.new, ...prev].slice(0, 5)))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' },
        () => {
          // Refresh hot events when any event updates (join, favorite, comment)
          supabase.from('events').select('*').eq('is_approved', true).gt('date', new Date().toISOString())
            .order('hot_score', { ascending: false }).limit(5)
            .then(({ data, error }) => {
              if (error) return; // silent — background refresh, avoid noisy repeated toasts
              setHotEvents(data || []);
            });
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  return (
    <div className="flex flex-col" style={{ gap: 8, fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div style={{ background: '#F0EAFC', borderRadius: 'var(--sv-r-card)', padding: 12 }}>
        <div style={{ font: "500 12px 'Outfit', sans-serif", color: '#4A3A73' }}>{tr.communityTitle}</div>
        <div style={{ marginTop: 5, font: "300 11.5px 'Outfit', sans-serif", lineHeight: 1.5, color: '#5A4A83' }}>{tr.communityText}</div>
      </div>

      <div style={cardStyle}>
        <div className="flex items-center gap-1.5" style={{ font: "500 11.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>
          <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 12 }}>🔥</span>{tr.hotRightNow}
        </div>
        <div className="flex flex-col mt-2" style={{ gap: 6 }}>
          {hotEvents.map(e => <EventLine key={e.id} event={e}/>)}
          {hotEvents.length === 0 && <p style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>{tr.noEventsYet}</p>}
        </div>
      </div>

      <div style={cardStyle}>
        <div className="flex items-center gap-1.5" style={{ font: "500 11.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}>
          <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 12 }}>🕐</span>{tr.justPosted}
        </div>
        <div className="flex flex-col mt-2" style={{ gap: 6 }}>
          {recentEvents.map(e => <EventLine key={e.id} event={e}/>)}
          {recentEvents.length === 0 && <p style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>{tr.noEventsYet}</p>}
        </div>
      </div>
    </div>
  );
}

function EventLine({ event }) {
  const capacity = event.max_capacity ? `${event.participants?.length || 0}/${event.max_capacity}` : null;
  return (
    <Link to={`/event/${event.id}`} className="flex items-baseline justify-between gap-2 group">
      <span
        className="line-clamp-1 group-hover:opacity-70 transition-opacity"
        style={{ font: "300 11.5px 'Outfit', sans-serif", color: 'var(--sv-ink-soft)' }}
      >
        {event.title}
      </span>
      {capacity && <span style={{ font: "400 10px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)', flexShrink: 0 }}>{capacity}</span>}
    </Link>
  );
}

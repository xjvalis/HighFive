import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { getCategoryStyle, getCategoryLabel } from "@/lib/categories";
import { isEventFull } from "@/lib/events";
import { SvIcon } from "@/components/icons/SvIcon";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

const WEEKDAYS_CS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

function whenLabel(date, lang) {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return lang === 'cs' ? 'dnes' : 'today';
  if (isTomorrow(d)) return lang === 'cs' ? 'zítra' : 'tomorrow';
  return lang === 'cs' ? WEEKDAYS_CS[d.getDay()] : format(d, 'EEEE').toLowerCase();
}

// Czech noun agreement for "participant(s)" — 1/2-4/5+ (doesn't special-case
// compound numbers like 21, but those are rare for event headcounts).
function participantWord(n, lang) {
  if (lang !== 'cs') return n === 1 ? 'participant' : 'participants';
  if (n === 1) return 'účastník';
  if (n >= 2 && n <= 4) return 'účastníci';
  return 'účastníků';
}

export default function EventCard({ event, onJoin, onFavorite, isJoined, isFavorited }) {
  const { lang } = useContext(LanguageContext);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const cat = getCategoryStyle(event.category);
  const participantCount = event.participants?.length || 0;
  const isFull = isEventFull(event);

  const handleJoinClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (joining) return;
    setJoining(true);
    try {
      await onJoin?.(event);
    } finally {
      setJoining(false);
    }
  };

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavorite?.(event);
  };

  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    navigate(`/event/${event.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="cursor-pointer transition-colors"
      style={{ background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 'var(--sv-r-card)', padding: '12px 14px' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#E7E2D9'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--sv-hairline)'}
    >
      <div className="flex items-center" style={{ gap: 5 }}>
        <span
          className="flex items-center flex-shrink-0"
          style={{ gap: 5, background: cat.bg, color: cat.ink, borderRadius: 'var(--sv-r-pill)', padding: '3px 8px', font: "400 10.5px 'Outfit', sans-serif" }}
        >
          <span style={{ fontFamily: 'var(--sv-font-emoji)', fontSize: 10.5 }}>{cat.emoji}</span>
          {getCategoryLabel(event.category, lang)}
        </span>
        <span style={{ font: "400 10.5px 'Outfit', sans-serif", color: 'var(--sv-meta)', background: 'var(--sv-surface-muted)', borderRadius: 'var(--sv-r-pill)', padding: '3px 8px' }}>
          {whenLabel(event.date, lang)}
        </span>
        <span className="ml-auto flex items-center flex-shrink-0" style={{ gap: 8 }}>
          {event.max_capacity && (
            <span style={{ font: "400 11px 'IBM Plex Mono', monospace", color: 'var(--sv-meta)' }}>
              <span style={{ color: 'var(--sv-brand-orange)', fontWeight: 500 }}>{participantCount}</span>
              {' '}{participantWord(participantCount, lang)}{' '}
              {lang === 'cs' ? 'ze' : 'of'}{' '}
              <span style={{ color: 'var(--sv-brand-purple)', fontWeight: 500 }}>{event.max_capacity}</span>
            </span>
          )}
          <button
            onClick={handleFavoriteClick}
            aria-label={lang === 'cs' ? 'Přidat do oblíbených' : 'Add to favorites'}
            className="flex items-center justify-center flex-shrink-0"
            style={{ padding: 6, margin: -6 }}
          >
            <SvIcon name="star" size={15} filled={isFavorited} style={{ color: isFavorited ? 'var(--sv-brand-orange)' : 'var(--sv-placeholder)' }}/>
          </button>
        </span>
      </div>

      <Link to={`/event/${event.id}`} onClick={e => e.stopPropagation()}>
        <h3
          className="line-clamp-1"
          style={{ marginTop: 7, font: "500 15.5px 'Outfit', sans-serif", letterSpacing: '-0.015em', color: 'var(--sv-ink)' }}
        >
          {event.title}
        </h3>
      </Link>

      <div className="flex items-center flex-wrap" style={{ marginTop: 5, gap: 12, font: "300 12px 'Outfit', sans-serif", color: 'var(--sv-meta)' }}>
        {event.location && (
          <span className="flex items-center gap-1 truncate max-w-[160px]">
            <SvIcon name="pin" size={11} style={{ color: '#B4AEA6', flexShrink: 0 }}/> {event.location}
          </span>
        )}
        {event.date && <span className="flex-shrink-0">{format(new Date(event.date), 'HH:mm')}</span>}
      </div>

      <div className="flex items-center" style={{ marginTop: 9, gap: 12 }} onClick={e => e.stopPropagation()}>
        <Link to={`/event/${event.id}`} style={{ font: "400 12px 'Outfit', sans-serif", color: 'var(--sv-link)' }}>
          {lang === 'cs' ? 'Diskuze' : 'Discussion'}
        </Link>
        {(!isFull || isJoined) && (
          <button
            onClick={handleJoinClick}
            disabled={joining}
            className="ml-auto flex items-center justify-center transition-colors"
            style={{
              font: "500 11.5px 'Outfit', sans-serif",
              padding: '6px 14px',
              borderRadius: 'var(--sv-r-pill)',
              background: isJoined ? 'var(--sv-action-bg-quiet)' : 'var(--sv-action-bg)',
              color: isJoined ? 'var(--sv-action-ink-quiet)' : 'var(--sv-action-ink)',
            }}
          >
            {joining
              ? <Loader2 className="w-3.5 h-3.5 animate-spin"/>
              : isJoined ? (lang === 'cs' ? 'Jdeš' : 'Going') : (lang === 'cs' ? 'Jdu' : 'Go')}
          </button>
        )}
      </div>
    </div>
  );
}

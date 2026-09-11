import { useState, useContext, useRef } from "react";
import { format } from "date-fns";
import { toPng } from "html-to-image";
import { Share2, Loader2 } from "lucide-react";
import { getCategoryStyle, getCategoryLabel } from "@/lib/categories";
import { SpoluvicMark } from "@/components/brand/SpoluvicLogo";
import { SvIcon } from "@/components/icons/SvIcon";
import { LanguageContext } from "@/lib/language";

const WEEKDAYS_SHORT_CS = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];

// Czech noun agreement for "spot(s) left" — 1/2-4/5+, mirrors the
// účastník/účastníci/účastníků pattern in EventCard.jsx.
function spotsWord(n, lang) {
  if (lang !== 'cs') return n === 1 ? 'spot left' : 'spots left';
  if (n === 1) return 'místo volné';
  if (n >= 2 && n <= 4) return 'místa volná';
  return 'míst volných';
}

function spotsRemaining(event) {
  if (event.max_capacity == null) return null;
  const count = event.participants?.length || 0;
  return Math.max(event.max_capacity - count, 0);
}

function cardDateLabel(date, lang) {
  const d = new Date(date);
  if (lang === 'cs') return `${WEEKDAYS_SHORT_CS[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}. · ${format(d, 'HH:mm')}`;
  return `${format(d, 'EEE d. MMM')} · ${format(d, 'HH:mm')}`;
}

function capacityLabel(event, lang) {
  if (event.max_capacity == null) return null;
  const count = event.participants?.length || 0;
  return lang === 'cs' ? `${count} z ${event.max_capacity}` : `${count} of ${event.max_capacity}`;
}

// Share message copy: nonchalant, no exclamation marks, no emoji.
function shareMessage(event, lang, eventUrl) {
  const d = new Date(event.date);
  const spots = spotsRemaining(event);
  const when = lang === 'cs'
    ? `${d.getDate()}. ${d.getMonth() + 1}. v ${format(d, 'HH:mm')}`
    : `${format(d, 'd. M.')} at ${format(d, 'HH:mm')}`;
  const namePart = lang === 'cs' ? `„${event.title}“ — ${when}` : `"${event.title}" — ${when}`;
  const parts = [
    `${namePart}${event.location ? `, ${event.location}` : ''}.`,
    spots != null ? `${spots} ${spotsWord(spots, lang)}.` : null,
    eventUrl,
  ].filter(Boolean);
  return parts.join(' ');
}

function slugify(str) {
  const s = (str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return s || 'udalost';
}

const CloseIcon = (props) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" {...props}>
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
  </svg>
);
const CopyIcon = (props) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
    <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" />
  </svg>
);
const DownloadIcon = ({ size = 13, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 2.5v7M5.2 7l2.8 2.8L10.8 7M3 12.5h10" />
  </svg>
);
const WhatsAppIcon = ({ size = 21, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2.5 8a5.5 5.5 0 1 1 2.4 4.5L2.5 13.5l1-2.4A5.4 5.4 0 0 1 2.5 8Z" />
  </svg>
);
const XIcon = ({ size = 21, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" {...props}>
    <path fill="currentColor" d="M3.1 2.6h3.3l3 4.1 3.4-4.1h1.5l-4.2 5 4.6 6.3h-3.3L8.2 9.6l-3.7 4.3H3l4.5-5.3L3.1 2.6Zm1.8 1.1 6.6 9h1.2l-6.6-9H4.9Z" />
  </svg>
);

// Small pixel version of the Spoluvíc lockup — matches SpoluvicMark (see
// src/components/brand/SpoluvicLogo.jsx) but as a self-contained inline
// wordmark for use inside the share cards, at a given text/mark height.
function ShareLockup({ height = 20, wordmarkSize = 15, color = "#2E2836" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.55 }}>
      <SpoluvicMark variant="orange" height={height} />
      <span style={{ font: `500 ${wordmarkSize}px 'Outfit', sans-serif`, letterSpacing: '-0.03em', color }}>Spoluvíc</span>
    </div>
  );
}

// ── 13b: card preview inside the share modal ──
function ModalPreviewCard({ event, cat, lang }) {
  const cap = capacityLabel(event, lang);
  return (
    <div style={{ background: cat.share, borderRadius: 18, padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <ShareLockup height={20} wordmarkSize={16} />
        <span style={{ marginLeft: 'auto', font: "500 10.5px 'IBM Plex Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: cat.shareInk }}>
          {lang === 'cs' ? 'náhled karty' : 'card preview'}
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
          <span style={{ font: "400 46px/1 var(--sv-font-emoji)" }}>{cat.emoji}</span>
        </div>
        <div style={{ background: 'var(--sv-surface)', borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ font: "500 20px 'Outfit', sans-serif", letterSpacing: '-0.03em', color: 'var(--sv-ink)' }}>{event.title}</span>
            {cap && (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <SvIcon name="users" size={10.5} style={{ color: cat.shareInk }} />
                <span style={{ font: "500 11.5px 'IBM Plex Mono', monospace", color: cat.shareInk }}>{cap}</span>
              </span>
            )}
          </div>
          <div style={{ marginTop: 7, font: "400 12.5px 'Outfit', sans-serif", color: 'var(--sv-muted)' }}>
            {[cardDateLabel(event.date, lang), event.location].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 11, display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ font: "500 12px 'Outfit', sans-serif", color: cat.shareInk }}>
          {getCategoryLabel(event.category, lang)} · Spoluvíc
        </span>
        <span style={{ marginLeft: 'auto', font: "500 11px 'IBM Plex Mono', monospace", color: cat.shareInk }}>spoluvic.cz</span>
      </div>
    </div>
  );
}

// ── 13a: full 1080×1920 downloadable card, rendered off-screen ──
function DownloadCard({ event, cat, lang, nodeRef }) {
  const cap = capacityLabel(event, lang);
  const spots = spotsRemaining(event);
  return (
    <div
      ref={nodeRef}
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: -1, opacity: 0, pointerEvents: 'none',
        width: 1080, height: 1920, boxSizing: 'border-box',
        background: cat.share, padding: '94px 94px 79px',
        display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif",
      }}
    >
      <ShareLockup height={58} wordmarkSize={79} />
      <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: "500 43px 'IBM Plex Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: cat.shareInk }}>
          {lang === 'cs' ? 'jdeš taky?' : 'you in?'}
        </span>
        <span style={{ font: "500 43px 'Outfit', sans-serif", color: cat.shareInk, background: '#fff', borderRadius: 999, padding: '5px 12px' }}>
          {getCategoryLabel(event.category, lang)}
        </span>
      </div>
      <div style={{ margin: 'auto 0 0', display: 'flex', justifyContent: 'center', padding: '16px 0 26px' }}>
        <span style={{ font: "400 389px/1 var(--sv-font-emoji)" }}>{cat.emoji}</span>
      </div>
      <div style={{ background: '#fff', borderRadius: 79, padding: 79 }}>
        <div style={{ font: "500 108px/1.1 'Outfit', sans-serif", letterSpacing: '-0.035em', color: 'var(--sv-ink)', textWrap: 'balance' }}>
          {event.title}
        </div>
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
            <span style={{ width: 187, flex: 'none', font: "500 41px 'IBM Plex Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sv-meta)' }}>
              {lang === 'cs' ? 'kdy' : 'when'}
            </span>
            <span style={{ font: "500 50px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>{cardDateLabel(event.date, lang)}</span>
          </div>
          <div style={{ height: 1, background: 'var(--sv-hairline)' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
            <span style={{ width: 187, flex: 'none', font: "500 41px 'IBM Plex Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sv-meta)' }}>
              {lang === 'cs' ? 'kde' : 'where'}
            </span>
            <span style={{ font: "500 50px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>
              {event.location || (lang === 'cs' ? 'Místo neuvedeno' : 'No location given')}
            </span>
          </div>
          {(cap || spots != null) && (
            <>
              <div style={{ height: 1, background: 'var(--sv-hairline)' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 11 }}>
                <span style={{ width: 187, flex: 'none', font: "500 41px 'IBM Plex Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sv-meta)' }}>
                  {lang === 'cs' ? 'kolik' : 'how many'}
                </span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 12, font: "500 50px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <SvIcon name="users" size={38} style={{ color: 'var(--sv-ink)' }} />
                    {cap}
                  </span>
                  {spots != null && (
                    <span style={{ font: "400 43px 'Outfit', sans-serif", color: 'var(--sv-muted)' }}>· {spots} {spotsWord(spots, lang)}</span>
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ font: "500 47px/1.35 'Outfit', sans-serif", color: cat.shareInk }}>
          {lang === 'cs' ? <>Přidej se, nebo si<br />najdi něco svého.</> : <>Join in, or find<br />something of your own.</>}
        </div>
        <div style={{ font: "500 43px 'IBM Plex Mono', monospace", color: cat.shareInk }}>spoluvic.cz</div>
      </div>
    </div>
  );
}

export default function ShareEventButton({ event }) {
  const { lang } = useContext(LanguageContext);
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const downloadNodeRef = useRef(null);
  const imgUrlRef = useRef(null);

  const cat = getCategoryStyle(event.category);
  const eventUrl = `${window.location.origin}/event/${event.id}`;
  const ogUrl = `${window.location.origin}/api/event-og?id=${event.id}`;
  const shareText = shareMessage(event, lang, eventUrl);

  const ensureCardImage = async () => {
    if (imgUrlRef.current) return imgUrlRef.current;
    if (!downloadNodeRef.current) return null;
    setGenerating(true);
    try {
      // Rendering can stall if the browser tab is backgrounded mid-capture
      // (image decode gets throttled) — don't leave the button stuck forever.
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Card render timed out')), 10000));
      const url = await Promise.race([
        toPng(downloadNodeRef.current, { width: 1080, height: 1920, pixelRatio: 1, skipFonts: true }),
        timeout,
      ]);
      imgUrlRef.current = url;
      return url;
    } catch (err) {
      console.error('Failed to render share card', err);
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = async () => {
    const url = await ensureCardImage();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `spoluvic-${slugify(event.title)}.png`;
    a.click();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SHARE_BTNS = [
    {
      label: "WhatsApp", bg: "#DCEFD3", ink: "#3F6B33",
      icon: <WhatsAppIcon color="#3F6B33" />,
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank"),
    },
    {
      label: "Facebook", bg: "#D6E4FF", ink: "#2F4FA8",
      icon: <span style={{ font: "600 20px/1 'Outfit', sans-serif", color: '#2F4FA8', height: 21, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>f</span>,
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogUrl)}`, "_blank"),
    },
    {
      label: "X / Twitter", bg: "#E8E4DC", ink: "#2E2836",
      icon: <XIcon color="#2E2836" />,
      action: () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(ogUrl)}`, "_blank"),
    },
    {
      label: "Instagram", bg: "#FFE0C2", ink: "#8A5A2B",
      icon: <DownloadIcon color="#8A5A2B" />,
      action: downloadImage, // Instagram doesn't allow direct URL share — download card
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-xl"
      >
        <Share2 className="w-3.5 h-3.5" />
        {lang === 'cs' ? 'Sdílet' : 'Share'}
      </button>

      <DownloadCard event={event} cat={cat} lang={lang} nodeRef={downloadNodeRef} />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(58,52,63,0.5)' }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{ background: 'var(--sv-bg)', borderRadius: 'var(--sv-r-card)', width: '100%', maxWidth: 430, padding: '18px 18px 16px', fontFamily: "'Outfit', sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span style={{ font: "500 17px 'Outfit', sans-serif", letterSpacing: '-0.025em', color: 'var(--sv-ink)' }}>
                {lang === 'cs' ? 'Sdílet událost' : 'Share event'}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label={lang === 'cs' ? 'Zavřít' : 'Close'}
                style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--sv-surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sv-meta)' }}
              >
                <CloseIcon />
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <ModalPreviewCard event={event} cat={cat} lang={lang} />
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 7 }}>
              {SHARE_BTNS.map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  disabled={btn.label === 'Instagram' && generating}
                  style={{ background: btn.bg, borderRadius: 14, padding: '13px 8px 11px', textAlign: 'center' }}
                >
                  <div style={{ height: 21, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {btn.label === 'Instagram' && generating ? <Loader2 className="animate-spin" size={16} color={btn.ink} /> : btn.icon}
                  </div>
                  <div style={{ marginTop: 7, font: "500 11px 'Outfit', sans-serif", color: btn.ink }}>{btn.label}</div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 9, display: 'flex', gap: 7 }}>
              <button
                onClick={copyLink}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--sv-surface)', border: '1px solid var(--sv-hairline)', borderRadius: 14, padding: 12, font: "500 12.5px 'Outfit', sans-serif", color: 'var(--sv-ink)' }}
              >
                <CopyIcon color="var(--sv-muted)" />
                {copied ? (lang === 'cs' ? 'Zkopírováno!' : 'Copied!') : (lang === 'cs' ? 'Kopírovat odkaz' : 'Copy link')}
              </button>
              <button
                onClick={downloadImage}
                disabled={generating}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--sv-empty-dot)', borderRadius: 14, padding: 12, font: "600 12.5px 'Outfit', sans-serif", color: '#3A2A0A', opacity: generating ? 0.6 : 1 }}
              >
                {generating ? <Loader2 className="animate-spin" size={13} color="#3A2A0A" /> : <DownloadIcon color="#3A2A0A" />}
                {lang === 'cs' ? 'Stáhnout kartu' : 'Download card'}
              </button>
            </div>
            <div style={{ marginTop: 10, textAlign: 'center', font: "400 11.5px 'Outfit', sans-serif", color: 'var(--sv-muted)' }}>
              {lang === 'cs' ? 'Pro Instagram Stories se karta stáhne — nahraj ji ručně.' : 'For Instagram Stories the card downloads — upload it yourself.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

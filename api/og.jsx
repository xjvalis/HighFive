// Vercel Edge Function — generates the branded 1200×630 OG share image for an
// event (design_handoff_spoluvic_web/"share karty"/SHARE_EVENT.md, variant 13c).
// URL: /api/og?id=EVENT_ID
import { ImageResponse } from '@vercel/og';
import { getCategoryStyle, getCategoryLabel } from '../src/lib/categories.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const EMOJI_FONT_STACK = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";

// Same 8×8 pixel grid as SpoluvicMark (src/components/brand/SpoluvicLogo.jsx),
// redrawn with divs instead of <svg><rect> since that's what satori renders reliably.
const MARK_ROWS = [[2, 4], [1, 6], [0, 8], [0, 8], [0, 8], [0, 8], [1, 6], [2, 4]];
const MARK_COLORS = ['#FFB033', '#5A3FB0', '#7C5CE0']; // left, overlap, right

function PixelMark({ height }) {
  const b = height / 8;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {MARK_ROWS.map(([o, w], i) => (
        <div key={i} style={{ display: 'flex', marginLeft: o * b }}>
          <div style={{ width: 4 * b, height: b, background: MARK_COLORS[0] }} />
          {w > 4 && <div style={{ width: (w - 4) * b, height: b, background: MARK_COLORS[1] }} />}
          <div style={{ width: 4 * b, height: b, background: MARK_COLORS[2] }} />
        </div>
      ))}
    </div>
  );
}

function spotsWord(n) {
  if (n === 1) return 'místo volné';
  if (n >= 2 && n <= 4) return 'místa volná';
  return 'míst volných';
}

async function loadGoogleFont(family, weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const css = await fetch(cssUrl, {
    // Old Chrome UA — Google Fonts serves TTF (not WOFF2) to it, which satori needs.
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36' },
  }).then((r) => r.text());
  const match = css.match(/src: url\(([^)]+)\)/);
  if (!match) throw new Error(`font src not found for ${family} ${weight}`);
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  let event = null;
  if (id && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=title,location,date,category,participants,max_capacity&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      event = data?.[0] || null;
    } catch (_) {}
  }

  const title = event?.title || 'Spoluvíc';
  const cat = getCategoryStyle(event?.category);
  const categoryLabel = getCategoryLabel(event?.category, 'cs');
  const when = event?.date
    ? new Date(event.date).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  const whenLoc = [when, event?.location].filter(Boolean).join(' · ');
  const count = event?.participants?.length || 0;
  const spots = event?.max_capacity != null ? Math.max(event.max_capacity - count, 0) : null;

  let fonts = [];
  try {
    const [outfit500, plexMono500, plexMono600] = await Promise.all([
      loadGoogleFont('Outfit', 500),
      loadGoogleFont('IBM+Plex+Mono', 500),
      loadGoogleFont('IBM+Plex+Mono', 600),
    ]);
    fonts = [
      { name: 'Outfit', data: outfit500, weight: 500, style: 'normal' },
      { name: 'IBM Plex Mono', data: plexMono500, weight: 500, style: 'normal' },
      { name: 'IBM Plex Mono', data: plexMono600, weight: 600, style: 'normal' },
    ];
  } catch (_) {
    // Fall back to satori's default font if Google Fonts can't be reached.
  }

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', background: cat.share }}>
        <div style={{ flex: 1, padding: '58px 53px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <PixelMark height={20} />
            <span style={{ fontFamily: 'Outfit', fontWeight: 500, fontSize: 17, letterSpacing: '-0.03em', color: '#2E2836' }}>Spoluvíc</span>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
            <span style={{ display: 'flex', alignSelf: 'flex-start', fontFamily: 'Outfit', fontWeight: 500, fontSize: 26, color: cat.shareInk, background: '#fff', borderRadius: 999, padding: '12px 26px' }}>
              {categoryLabel}
            </span>
            <div style={{ marginTop: 29, display: 'flex', fontFamily: 'Outfit', fontWeight: 500, fontSize: 72, letterSpacing: '-0.035em', color: '#2E2836' }}>
              {title}
            </div>
            {whenLoc && (
              <div style={{ marginTop: 26, display: 'flex', fontFamily: 'Outfit', fontWeight: 500, fontSize: 31, color: cat.shareInk }}>
                {whenLoc}
              </div>
            )}
            <div style={{ marginTop: 34, display: 'flex', alignItems: 'center', gap: 29 }}>
              {spots != null && (
                <span style={{ display: 'flex', fontFamily: 'Outfit', fontWeight: 600, fontSize: 31, color: '#2E2836', background: '#FFB84D', borderRadius: 999, padding: '14px 31px' }}>
                  {spots} {spotsWord(spots)}
                </span>
              )}
              <span style={{ display: 'flex', fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 28, color: cat.shareInk }}>spoluvic.cz</span>
            </div>
          </div>
        </div>
        <div style={{ width: 494, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: EMOJI_FONT_STACK, fontSize: 269, lineHeight: 1, display: 'flex' }}>{cat.emoji}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}

export const config = { runtime: 'edge' };

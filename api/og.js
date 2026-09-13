// Vercel Edge Function — generates the branded 1200×630 OG share image for an
// event (design_handoff_spoluvic_web/"share karty"/SHARE_EVENT.md, variant 13c).
// URL: /api/og?id=EVENT_ID
//
// Uses satori + @resvg/resvg-wasm directly instead of the @vercel/og wrapper.
// @vercel/og's package.json only resolves to its edge build under the
// "edge"/"edge-light"/"worker" export conditions, which Next.js sets itself
// when bundling for Edge — a plain Vercel Function build (this is a Vite
// project, not Next.js) never sets them, so the bare specifier always
// resolved to its Node.js build and crashed at runtime with "Dynamic
// require of 'fs' is not supported" (reproduced identically in production
// and locally). A deep import of its edge build
// (@vercel/og/dist/index.edge.js) is blocked by Node's "exports"
// restriction (only "." is exported); vendoring that built file locally got
// past the restriction but Vercel's own Edge Function validator then
// rejected the vendored bundle outright ("referencing unsupported
// modules"). satori has no such split (a single universal build) and
// @resvg/resvg-wasm explicitly exports its .wasm file
// (`"./index_bg.wasm": "./index_bg.wasm"` in its package.json) for exactly
// this edge-import pattern, so neither hits the problem.
//
// Written as plain object trees (a tiny `h()` helper) instead of JSX: Vercel's
// zero-config Function build doesn't transform JSX for API routes, so an
// earlier JSX version of this file silently never deployed. satori accepts
// this plain {type, props: {style, children}} shape directly, no React/JSX
// needed.
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import resvgWasmModule from '@resvg/resvg-wasm/index_bg.wasm';

// Duplicated (not imported) from src/lib/categories.js: Vercel's Edge Function
// bundler doesn't reliably pick up relative imports that reach outside api/ —
// keep only the fields this file needs, share/shareInk in sync with
// src/lib/categories.js by hand if they change.
const CATEGORIES = [
  { name: "Hangout", labelCs: "Hangout", emoji: "☕", share: "#FFDCBE", shareInk: "#6B3E14" },
  { name: "One-on-One", labelCs: "One-on-One", emoji: "🤝", share: "#FFEFB8", shareInk: "#5F4608" },
  { name: "Sport", labelCs: "Sport", emoji: "⚽", share: "#D2E1FF", shareInk: "#23407F" },
  { name: "Board Games", labelCs: "Deskové hry", emoji: "🎲", share: "#E6DCFA", shareInk: "#3F2E70" },
  { name: "Outdoors", labelCs: "Příroda", emoji: "🌿", share: "#D8ECCD", shareInk: "#33552A" },
  { name: "Culture", labelCs: "Kultura", emoji: "🎨", share: "#E5C3A4", shareInk: "#673D1D" },
  { name: "Movies", labelCs: "Film", emoji: "🎬", share: "#FFD5A8", shareInk: "#6B3A0C" },
  { name: "Music", labelCs: "Hudba", emoji: "🎵", share: "#CCC7F0", shareInk: "#333468" },
  { name: "Gaming", labelCs: "Gaming", emoji: "🎮", share: "#B7E6EC", shareInk: "#114F5E" },
  { name: "Food", labelCs: "Jídlo a pití", emoji: "🍜", share: "#ECBEBE", shareInk: "#752A2A" },
  { name: "Creative", labelCs: "Kreativa", emoji: "✏️", share: "#E9D691", shareInk: "#644D0A" },
  { name: "Tech", labelCs: "Tech", emoji: "💻", share: "#C6CDDA", shareInk: "#2C3748" },
  { name: "Study", labelCs: "Studium", emoji: "📚", share: "#FFF2C2", shareInk: "#5E4408" },
  { name: "Wellness", labelCs: "Wellness", emoji: "🧘", share: "#C5DCCB", shareInk: "#2A503A" },
  { name: "Nightlife", labelCs: "Party", emoji: "🌙", share: "#BAC1E0", shareInk: "#222C58" },
  { name: "Other", labelCs: "Ostatní", emoji: "✨", share: "#D6D0C5", shareInk: "#48423A" },
];
const getCategoryStyle = (name) => CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
const getCategoryLabel = (name) => (CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1]).labelCs;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const EMOJI_FONT_STACK = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";

function h(type, props = {}, children) {
  return { type, props: { ...props, children } };
}

// Same 8×8 pixel grid as SpoluvicMark (src/components/brand/SpoluvicLogo.jsx),
// redrawn with divs instead of <svg><rect> since that's what satori renders reliably.
const MARK_ROWS = [[2, 4], [1, 6], [0, 8], [0, 8], [0, 8], [0, 8], [1, 6], [2, 4]];
const MARK_COLORS = ['#FFB033', '#5A3FB0', '#7C5CE0']; // left, overlap, right

function pixelMark(height) {
  const b = height / 8;
  return h('div', { style: { display: 'flex', flexDirection: 'column' } },
    MARK_ROWS.map(([o, w], i) =>
      h('div', { key: i, style: { display: 'flex', marginLeft: o * b } }, [
        h('div', { style: { width: 4 * b, height: b, background: MARK_COLORS[0] } }),
        w > 4 ? h('div', { style: { width: (w - 4) * b, height: b, background: MARK_COLORS[1] } }) : null,
        h('div', { style: { width: 4 * b, height: b, background: MARK_COLORS[2] } }),
      ].filter(Boolean))
    )
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

// initWasm() throws if called twice, so the module-level promise is memoized
// across warm invocations of this same edge function instance.
let wasmReady = null;
function ensureResvgWasm() {
  if (!wasmReady) wasmReady = initWasm(resvgWasmModule);
  return wasmReady;
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
  const categoryLabel = getCategoryLabel(event?.category);
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
    // satori requires at least one font — fall back to a minimal system stack
    // reference if Google Fonts couldn't be reached (satori still needs real
    // font data, so this case just lets the request fail gracefully below).
  }

  const tree = h('div', { style: { width: 1200, height: 630, display: 'flex', background: cat.share } }, [
    h('div', { style: { flex: 1, padding: '58px 53px', display: 'flex', flexDirection: 'column' } }, [
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } }, [
        pixelMark(20),
        h('span', { style: { fontFamily: 'Outfit', fontWeight: 500, fontSize: 17, letterSpacing: '-0.03em', color: '#2E2836' } }, 'Spoluvíc'),
      ]),
      h('div', { style: { marginTop: 'auto', display: 'flex', flexDirection: 'column' } }, [
        h('span', { style: { display: 'flex', alignSelf: 'flex-start', fontFamily: 'Outfit', fontWeight: 500, fontSize: 26, color: cat.shareInk, background: '#fff', borderRadius: 999, padding: '12px 26px' } }, categoryLabel),
        h('div', { style: { marginTop: 29, display: 'flex', fontFamily: 'Outfit', fontWeight: 500, fontSize: 72, letterSpacing: '-0.035em', color: '#2E2836' } }, title),
        whenLoc ? h('div', { style: { marginTop: 26, display: 'flex', fontFamily: 'Outfit', fontWeight: 500, fontSize: 31, color: cat.shareInk } }, whenLoc) : null,
        h('div', { style: { marginTop: 34, display: 'flex', alignItems: 'center', gap: 29 } }, [
          spots != null ? h('span', { style: { display: 'flex', fontFamily: 'Outfit', fontWeight: 600, fontSize: 31, color: '#2E2836', background: '#FFB84D', borderRadius: 999, padding: '14px 31px' } }, `${spots} ${spotsWord(spots)}`) : null,
          h('span', { style: { display: 'flex', fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 28, color: cat.shareInk } }, 'spoluvic.app'),
        ].filter(Boolean)),
      ].filter(Boolean)),
    ]),
    h('div', { style: { width: 494, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h('span', { style: { fontFamily: EMOJI_FONT_STACK, fontSize: 269, lineHeight: 1, display: 'flex' } }, cat.emoji)
    ),
  ]);

  try {
    const [svg] = await Promise.all([
      satori(tree, { width: 1200, height: 630, fonts }),
      ensureResvgWasm(),
    ]);
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error('og image generation error:', error);
    return new Response(`Image generation failed: ${error.message}`, { status: 500 });
  }
}

export const config = { runtime: 'edge' };

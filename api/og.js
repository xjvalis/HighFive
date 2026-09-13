// Vercel Function, Node.js runtime — generates the branded 1200×630 OG share
// image for an event (design_handoff_spoluvic_web/"share karty"/SHARE_EVENT.md,
// variant 13c). URL: /api/og?id=EVENT_ID
//
// History, briefly (this file has been through it):
// - @vercel/og resolves to its Node.js build outside Next.js regardless of
//   config.runtime, and that build crashes with "Dynamic require of 'fs' is
//   not supported" — reproduced in production and locally, both as ESM and
//   as CommonJS. Not usable here at all.
// - satori + @resvg/resvg-wasm (what @vercel/og wraps internally) as Edge
//   Functions kept getting Vercel's Edge Function *build* itself rejected —
//   "referencing unsupported modules" — twice, for different transitive
//   dependencies (first @vercel/og leftovers, then harfbuzzjs's fs usage),
//   each time actually failing the deploy, not just warning.
// - Node.js runtime is what actually deploys reliably (confirmed: an earlier
//   Node.js attempt at this file deployed fine and only failed at runtime,
//   because it was still using @vercel/og's broken bundle). Node has real
//   `fs`, so @resvg/resvg-wasm's WASM can be loaded the plain, boring way —
//   readFileSync from node_modules — instead of the Edge-only
//   `import wasm from '*.wasm'` syntax, which is what actually needs Edge.
import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resvgWasmBuffer = readFileSync(join(__dirname, '../node_modules/@resvg/resvg-wasm/index_bg.wasm'));

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

// satori has no access to a system emoji font (there isn't one on a server),
// so a plain <span> with an emoji font-family stack just renders tofu —
// satori's documented fix is `graphemeImages`, swapping the character for an
// actual image. Twemoji covers every category emoji used in categories.js.
// resvg (the final SVG→PNG rasterization step) has no network access, so a
// remote <image href> in the SVG satori produces never loads — the image
// content has to already be inlined as a data URI by the time satori runs.
async function twemojiDataUri(emoji) {
  const codepoints = [...emoji]
    .map((c) => c.codePointAt(0).toString(16))
    .filter((cp) => cp !== 'fe0f') // strip the variation selector — Twemoji's filenames omit it
    .join('-');
  const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
  const svg = await fetch(url).then((r) => r.text());
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

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

// Google's CSS2 API replies with one @font-face block per Unicode subset
// (latin, latin-ext, ...) — Czech diacritics split across both, so a single
// subset alone renders half the alphabet as tofu. satori does NOT do
// browser-style unicode-range fallback within one font name — passing both
// buffers under the *same* name just silently uses one and ignores the
// other. It does, like CSS, fall through a `fontFamily: "A, B"` list per
// glyph, so each subset gets registered under its own synthetic name and
// chained that way instead.
async function loadGoogleFontStack(family, weight) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const css = await fetch(cssUrl, {
    // Old Chrome UA — Google Fonts serves TTF/WOFF (not WOFF2) to it, which satori needs.
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36' },
  }).then((r) => r.text());
  const urls = [...css.matchAll(/src: url\(([^)]+)\)/g)].map((m) => m[1]);
  if (!urls.length) throw new Error(`font src not found for ${family} ${weight}`);
  const buffers = await Promise.all(urls.map((url) => fetch(url).then((r) => r.arrayBuffer())));
  const slug = family.replace(/\s+/g, '');
  const names = buffers.map((_, i) => `${slug}-${weight}-${i}`);
  return {
    fontFamily: names.join(', '),
    fonts: buffers.map((data, i) => ({ name: names[i], data, weight, style: 'normal' })),
  };
}

// initWasm() throws if called twice, so the module-level promise is memoized
// across warm invocations of this same edge function instance.
let wasmReady = null;
function ensureResvgWasm() {
  if (!wasmReady) wasmReady = initWasm(resvgWasmBuffer);
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
  let outfitFamily = 'Outfit';
  let monoFamily = 'IBM Plex Mono';
  try {
    const [outfitStack, monoStack] = await Promise.all([
      loadGoogleFontStack('Outfit', 500),
      loadGoogleFontStack('IBM Plex Mono', 500),
    ]);
    fonts = [...outfitStack.fonts, ...monoStack.fonts];
    outfitFamily = outfitStack.fontFamily;
    monoFamily = monoStack.fontFamily;
  } catch (_) {
    // satori requires at least one font — this just lets the request fail
    // gracefully below if Google Fonts couldn't be reached.
  }

  const tree = h('div', { style: { width: 1200, height: 630, display: 'flex', background: cat.share } }, [
    h('div', { style: { flex: 1, padding: '58px 53px', display: 'flex', flexDirection: 'column' } }, [
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } }, [
        pixelMark(20),
        h('span', { style: { fontFamily: outfitFamily, fontWeight: 500, fontSize: 17, letterSpacing: '-0.03em', color: '#2E2836' } }, 'Spoluvíc'),
      ]),
      h('div', { style: { marginTop: 'auto', display: 'flex', flexDirection: 'column' } }, [
        h('span', { style: { display: 'flex', alignSelf: 'flex-start', fontFamily: outfitFamily, fontWeight: 500, fontSize: 26, color: cat.shareInk, background: '#fff', borderRadius: 999, padding: '12px 26px' } }, categoryLabel),
        h('div', { style: { marginTop: 29, display: 'flex', fontFamily: outfitFamily, fontWeight: 500, fontSize: 72, letterSpacing: '-0.035em', color: '#2E2836' } }, title),
        whenLoc ? h('div', { style: { marginTop: 26, display: 'flex', fontFamily: outfitFamily, fontWeight: 500, fontSize: 31, color: cat.shareInk } }, whenLoc) : null,
        h('div', { style: { marginTop: 34, display: 'flex', alignItems: 'center', gap: 29 } }, [
          spots != null ? h('span', { style: { display: 'flex', fontFamily: outfitFamily, fontWeight: 600, fontSize: 31, color: '#2E2836', background: '#FFB84D', borderRadius: 999, padding: '14px 31px' } }, `${spots} ${spotsWord(spots)}`) : null,
          h('span', { style: { display: 'flex', fontFamily: monoFamily, fontWeight: 500, fontSize: 28, color: cat.shareInk } }, 'spoluvic.app'),
        ].filter(Boolean)),
      ].filter(Boolean)),
    ]),
    h('div', { style: { width: 494, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      h('span', { style: { fontSize: 269, lineHeight: 1, display: 'flex' } }, cat.emoji)
    ),
  ]);

  try {
    const [emojiDataUri] = await Promise.all([twemojiDataUri(cat.emoji), ensureResvgWasm()]);
    const svg = await satori(tree, {
      width: 1200,
      height: 630,
      fonts,
      graphemeImages: { [cat.emoji]: emojiDataUri },
    });
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
    return new Response(png, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error('og image generation error:', error);
    return new Response(`Image generation failed: ${error.message}`, { status: 500 });
  }
}

export const config = { runtime: 'nodejs' };

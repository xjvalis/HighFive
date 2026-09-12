// Vercel Edge Middleware — serves link-preview crawlers (WhatsApp, iMessage,
// Slack, Discord, Telegram, ...) the pre-rendered OG tags from api/event-og.js
// when they hit a real /event/:id URL, while everyone else gets the normal
// SPA. This is what lets every share channel — WhatsApp text, "Kopírovat
// odkaz", Facebook, X — use the one clean spoluvic.app/event/:id link and
// still get a branded preview, instead of only Facebook/X (which routed
// through the uglier /api/event-og?id=... URL directly).
import eventOgHandler from './api/event-og.js';

// None of these run client-side JS, so they never see the real page's
// client-rendered <meta> tags (see src/hooks/usePageMeta.js) — only what's
// in the HTML they're served here.
const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|Slackbot|Discordbot|LinkedInBot|Applebot|SkypeUriPreview|vkShare|redditbot|Pinterest|Googlebot|bingbot|DuckDuckBot|W3C_Validator/i;

export default async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(userAgent)) return;

  const url = new URL(request.url);
  const id = url.pathname.split('/').filter(Boolean)[1]; // /event/:id
  if (!id) return;

  const ogUrl = new URL('/api/event-og', url);
  ogUrl.searchParams.set('id', id);
  // event-og.js only ever reads req.url, so a bare Request for the rewritten
  // URL is enough — no need to carry over the original method/headers.
  return eventOgHandler(new Request(ogUrl));
}

// Node.js runtime, not Edge: Vercel's Edge runtime restricts which modules a
// function can reference, and since middleware.js and api/og.js sit in the
// same directory, the build was bundling middleware together with og.js's
// @vercel/og dependency — which Edge doesn't allow — silently breaking
// middleware's deploy (confirmed in the build log: 'The Edge Function
// "middleware" is referencing unsupported modules: - @vercel: module').
export const config = { matcher: '/event/:id*', runtime: 'nodejs' };

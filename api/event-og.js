// Vercel Edge Function — generuje OG meta tagy pro každou událost
// URL: /api/event-og?id=EVENT_ID

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const CATEGORY_EMOJIS = {
  'Hangout': '☕', 'One-on-One': '🤝', 'Sport': '⚽', 'Board Games': '🎲',
  'Outdoors': '🌿', 'Culture': '🎭', 'Film': '🎬', 'Music': '🎵',
  'Gaming': '🎮', 'Food & Drinks': '🍕', 'Creative': '🎨', 'Tech': '💻',
  'Study': '📚', 'Travel': '✈️', 'Wellness': '🧘',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  let event = null;

  if (id && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/events?id=eq.${id}&select=title,description,location,date,category,image_url,participants&limit=1`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      event = data?.[0] || null;
    } catch (_) {}
  }

  const siteUrl = 'https://high-five-nine.vercel.app';

  let title = 'Spoluvíc — Najdi lidi pro společné aktivity';
  let description = 'Platforma pro hledání lidí na společné aktivity. Žádní sledující, žádné lajky — jen dobré zážitky.';
  let image = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=630&fit=crop';
  let url = siteUrl;

  if (event) {
    const emoji = CATEGORY_EMOJIS[event.category] || '🙌';
    const date = event.date
      ? new Date(event.date).toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    const count = event.participants?.length || 0;

    title = `${emoji} ${event.title}`;
    description = [
      event.location && `📍 ${event.location}`,
      date && `📅 ${date}`,
      count > 0 && `👥 ${count} ${count === 1 ? 'účastník' : count < 5 ? 'účastníci' : 'účastníků'}`,
      event.description ? event.description.slice(0, 100) + (event.description.length > 100 ? '…' : '') : null,
    ].filter(Boolean).join(' · ');

    image = event.image_url || image;
    url = `${siteUrl}/event/${id}`;
  }

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8"/>
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:site_name" content="Spoluvíc"/>
  <meta property="og:title" content="${escHtml(title)}"/>
  <meta property="og:description" content="${escHtml(description)}"/>
  <meta property="og:image" content="${escHtml(image)}"/>
  <meta property="og:url" content="${escHtml(url)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${escHtml(title)}"/>
  <meta name="twitter:description" content="${escHtml(description)}"/>
  <meta name="twitter:image" content="${escHtml(image)}"/>
  <meta http-equiv="refresh" content="0; url=${escHtml(url)}"/>
</head>
<body>
  <p>Přesměrování na <a href="${escHtml(url)}">${escHtml(title)}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 's-maxage=300' },
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const config = { runtime: 'edge' };

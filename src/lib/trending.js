// Single shared definition of "popular"/"trending", used by every screen that
// claims to rank by it (Home's Populární tab, the standalone /trending page,
// RightSidebar's Hot právě teď) so they can't silently disagree with each
// other. Ranks on signals the app actually keeps correct: people signed up,
// an active discussion, being favorited a lot (comments_count/favorites_count
// are maintained by DB triggers — see supabase/schema.sql — never by ad hoc
// client writes), only a few spots left (scarcity reads as "in demand" more
// than raw headcount), and already underway.
export function trendingScore(event, now = new Date()) {
  const capacity = event.max_capacity;
  const going = event.participants?.length || 0;
  const spotsLeft = capacity ? capacity - going : null;
  const almostFull = spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 3;

  return going * 3
    + (event.comments_count || 0) * 2
    + (event.favorites_count || 0) * 2
    + (almostFull ? 8 : 0)
    + (new Date(event.date) <= now ? 5 : 0);
}

export function sortByTrending(events, now = new Date()) {
  return [...events].sort((a, b) =>
    trendingScore(b, now) - trendingScore(a, now) || new Date(a.date) - new Date(b.date)
  );
}

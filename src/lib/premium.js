// Shared free-tier / premium logic.
//
// "Is this profile premium" and "how many joins/creates has this profile
// used this month" were independently re-implemented — with the same
// isNewMonth date-rollover formula — in Home.jsx (twice), EventDetail.jsx
// (twice), and CreateEvent.jsx. One copy here, imported everywhere.
//
// supabase/functions/join-event and create-event have their own
// authoritative copies of the same checks — they're the real enforcement,
// run in a separate (Deno) runtime that can't import from src/, and must be
// kept in sync by hand if either limit or the plan-check formula changes.
// Everything in this file is UI-only (upsell banners, disabling a button
// before even calling the function) — never the sole gate.

export const MONTHLY_JOIN_LIMIT = 3;
export const MONTHLY_CREATE_LIMIT = 1;

export function isPremiumProfile(profile) {
  return !!(profile?.is_premium || ['plus', 'creator'].includes(profile?.subscription_plan));
}

// True once a new calendar month has started since monthly_reset_date was
// last set — the monthly counters should read as 0 past that point, even
// though the stored count itself isn't zeroed until the next actual
// join/create (see supabase/functions/join-event & create-event).
function isNewMonth(profile) {
  const reset = profile?.monthly_reset_date ? new Date(profile.monthly_reset_date) : null;
  if (!reset) return true;
  const now = new Date();
  return now.getFullYear() > reset.getFullYear() || now.getMonth() > reset.getMonth();
}

export function monthlyJoinsUsed(profile) {
  return isNewMonth(profile) ? 0 : (profile?.monthly_join_count || 0);
}

export function monthlyCreatesUsed(profile) {
  return isNewMonth(profile) ? 0 : (profile?.monthly_create_count || 0);
}

export function canJoinEvent(profile) {
  if (!profile) return true;
  if (isPremiumProfile(profile)) return true;
  return monthlyJoinsUsed(profile) < MONTHLY_JOIN_LIMIT;
}

export function canCreateEvent(profile) {
  if (!profile) return true;
  if (isPremiumProfile(profile)) return true;
  return monthlyCreatesUsed(profile) < MONTHLY_CREATE_LIMIT;
}

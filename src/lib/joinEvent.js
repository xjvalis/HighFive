import { supabase } from '@/lib/supabaseClient';

// The one real subtlety of calling the join-event edge function, independently
// rediscovered (and gotten wrong in most places) across EventDetail, Home,
// Favorites, MyEvents and Trending: supabase-js puts a non-2xx response's JSON
// body on error.context (the raw Response), not on `data` — so `data?.error`
// is only ever populated on a 2xx response. Checking data?.error for something
// like monthly_limit_reached (a 403) is dead code; it always falls through to
// whatever the caller does for a generic `error`. This never throws — a
// network failure comes back as { errorCode: 'unknown' } instead of an
// uncaught rejection, so a caller can never "do nothing" on a real failure.
export async function callJoinEvent(eventId, action) {
  try {
    const { data, error } = await supabase.functions.invoke('join-event', { body: { event_id: eventId, action } });
    let errorCode = data?.error;
    if (error && !errorCode) {
      try { errorCode = (await error.context.json())?.error; } catch { /* no JSON body */ }
    }
    if (errorCode) return { errorCode };
    if (error) return { errorCode: 'unknown' };
    return { event: data?.event };
  } catch (_) {
    return { errorCode: 'unknown' };
  }
}

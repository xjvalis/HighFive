// Shared event-state predicates.
//
// "Is this event full" and "is this event over" were each independently
// re-implemented with the same formula in half a dozen files (EventCard,
// EventMap, OrganizerEventCard, EventDetail, Home, MyEvents, Trending) —
// harmless while every copy agrees, but a change to either rule would have
// needed to land in all of them by hand. One copy here, imported everywhere.
//
// supabase/functions/join-event/index.ts has its own copy of isEventFull —
// it's the authoritative server-side check and runs in a separate (Deno)
// runtime that can't import from src/, so keep that one in sync by hand if
// this formula ever changes.

export function isEventFull(event) {
  return !!(event?.max_capacity && (event.participants?.length || 0) >= event.max_capacity);
}

// An event with no explicit end_time is treated as running 2 hours from its
// start, for "is this still happening" checks (My Events, Trending, Home's
// "right now" filter).
export function isEventOver(event, now = new Date()) {
  const end = event.end_time
    ? new Date(event.end_time)
    : new Date(new Date(event.date).getTime() + 2 * 60 * 60 * 1000);
  return now > end;
}

-- Track which specific events a free-plan user has already spent a
-- monthly join on, so leaving an event and rejoining it later the same
-- month doesn't burn a second slot. monthly_join_count now derives from
-- the length of this array (see supabase/functions/join-event) instead of
-- being incremented on every join action regardless of which event it was.
alter table public.user_profiles
  add column monthly_joined_event_ids uuid[] default '{}';

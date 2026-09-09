-- Scaling audit follow-up: indexes for query patterns that currently do a
-- sequential scan and will get slower as the tables grow.
--
-- Run this once in the Supabase SQL editor (or `supabase db push`).

-- Home/Trending/RightSidebar all filter "is_approved = true AND date > now()"
-- then sort by date — currently served by two separate single-column
-- indexes; a composite covers the combined filter+sort in one pass.
create index if not exists events_approved_date_idx
  on public.events (is_approved, date);

-- RightSidebar's "hot right now" query orders by hot_score with no index at
-- all on it.
create index if not exists events_hot_score_idx
  on public.events (hot_score desc nulls last);

-- MyEvents' "am I a participant of this event" check
-- (`.contains('participants', [email])`) is a sequential array scan without
-- a GIN index.
create index if not exists events_participants_gin_idx
  on public.events using gin (participants);

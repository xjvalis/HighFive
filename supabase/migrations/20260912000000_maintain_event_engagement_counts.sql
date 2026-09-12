-- Fix events.comments_count / events.favorites_count: both were being
-- maintained by client-side "read the current value, write value+1" calls,
-- which (a) lose updates under concurrent writers, and (b) for comments_count
-- specifically, were blocked outright by events_update_own_or_admin RLS
-- whenever the commenter wasn't the event's organizer — i.e. almost always.
-- Maintain both with triggers instead, the same way the rest of this schema
-- handles cross-row privileged writes (see protect_privileged_profile_fields).
--
-- Also drop hot_score: nothing has ever computed it (checked every migration,
-- edge function and trigger — there's no writer), so it's null for every
-- event created through the real app and frozen/stale for the handful of
-- older rows that have a value. "Hot právě teď" (RightSidebar) and the
-- Populární tabs now rank client-side via src/lib/trending.js instead.

create or replace function public.adjust_event_comments_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.events set comments_count = coalesce(comments_count, 0) + 1 where id = new.event_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.events set comments_count = greatest(coalesce(comments_count, 0) - 1, 0) where id = old.event_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_on_insert on public.comments;
create trigger comments_count_on_insert
  after insert on public.comments
  for each row execute function public.adjust_event_comments_count();

drop trigger if exists comments_count_on_delete on public.comments;
create trigger comments_count_on_delete
  after delete on public.comments
  for each row execute function public.adjust_event_comments_count();

create or replace function public.adjust_event_favorites_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  added uuid[];
  removed uuid[];
begin
  added := array(select unnest(new.favorited_events) except select unnest(old.favorited_events));
  removed := array(select unnest(old.favorited_events) except select unnest(new.favorited_events));

  if array_length(added, 1) > 0 then
    update public.events set favorites_count = coalesce(favorites_count, 0) + 1 where id = any(added);
  end if;
  if array_length(removed, 1) > 0 then
    update public.events set favorites_count = greatest(coalesce(favorites_count, 0) - 1, 0) where id = any(removed);
  end if;
  return new;
end;
$$;

drop trigger if exists favorites_count_on_change on public.user_profiles;
create trigger favorites_count_on_change
  after update on public.user_profiles
  for each row
  when (old.favorited_events is distinct from new.favorited_events)
  execute function public.adjust_event_favorites_count();

drop index if exists public.events_hot_score_idx;
alter table public.events drop column if exists hot_score;

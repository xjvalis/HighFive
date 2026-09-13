-- The 2026-09-12 migration (maintain_event_engagement_counts) dropped the
-- hot_score column and its index, reasoning "nothing has ever computed it" —
-- but missed this BEFORE INSERT OR UPDATE trigger, which very much did.
-- Every single insert/update to public.events since that migration (joining,
-- leaving, editing, admin approve/suspend — everything) has been failing
-- with 'record "new" has no field "hot_score"', because the trigger fires
-- before the row write completes and tries to assign to a column that no
-- longer exists. join-event swallowed the resulting error and returned a
-- 200 with an empty event, which is why joining an event looked like it did
-- nothing at all. Trending is computed client-side now (src/lib/trending.js)
-- — this trigger has no reason to exist anymore.
drop trigger if exists trigger_hot_score on public.events;
drop function if exists public.update_hot_score();

-- join-event previously read events.participants/waitlist into JS, computed
-- the new array, and wrote the whole column back — a classic read-modify-write
-- race. Two different users joining the same near-full event at nearly the
-- same instant could both pass the capacity check (each reading the row
-- before the other's write lands), and whichever UPDATE commits last fully
-- overwrites the array, silently dropping the other user's addition even
-- though they were already told they'd joined (and had a monthly slot
-- charged for it). Locking the row for the duration of the check+update
-- closes that window.
create or replace function public.update_event_attendance(
  p_event_id uuid,
  p_action text,
  p_user_email text
) returns public.events
language plpgsql
as $$
declare
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'event_not_found';
  end if;

  if p_action = 'join' then
    if p_user_email = any(v_event.participants) then
      raise exception 'already_joined';
    end if;
    if v_event.max_capacity is not null
       and coalesce(array_length(v_event.participants, 1), 0) >= v_event.max_capacity then
      raise exception 'event_full';
    end if;
    update public.events set participants = array_append(participants, p_user_email)
      where id = p_event_id returning * into v_event;

  elsif p_action = 'leave' then
    update public.events set participants = array_remove(participants, p_user_email)
      where id = p_event_id returning * into v_event;

  elsif p_action = 'join_waitlist' then
    if p_user_email = any(v_event.waitlist) then
      raise exception 'already_on_waitlist';
    end if;
    update public.events set waitlist = array_append(waitlist, p_user_email)
      where id = p_event_id returning * into v_event;

  elsif p_action = 'leave_waitlist' then
    update public.events set waitlist = array_remove(waitlist, p_user_email)
      where id = p_event_id returning * into v_event;

  else
    raise exception 'invalid_action';
  end if;

  return v_event;
end;
$$;

-- Only join-event (via the service role, which bypasses this anyway) should
-- call this — it has no monthly-quota check of its own, so letting a plain
-- authenticated client call it directly would bypass the free-plan limit.
revoke all on function public.update_event_attendance(uuid, text, text) from public, anon, authenticated;

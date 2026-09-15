-- Both direct_messages' dm_insert_auth and event_group_messages'
-- group_messages_insert_members only checked from_id/author_id = auth.uid()
-- — the *_email column was never checked against anything, so a member who
-- already has legitimate access to a conversation (their own DMs, or a
-- group chat for an event they're really in) could still POST a raw insert
-- with a fabricated from_email/author_email, impersonating someone else's
-- identity in a room they're allowed to be in. auth.email() reads the
-- verified email off the caller's own JWT — the client cannot set this to
-- anything but their real address, unlike a plain column in the request body.
drop policy if exists "dm_insert_auth" on public.direct_messages;
create policy "dm_insert_auth" on public.direct_messages
  for insert with check (from_id = auth.uid() and from_email = auth.email());

drop policy if exists "group_messages_insert_members" on public.event_group_messages;
create policy "group_messages_insert_members" on public.event_group_messages
  for insert with check (
    author_id = auth.uid()
    and author_email = auth.email()
    and is_event_member(event_id, auth.uid())
    and (
      exists (select 1 from public.event_group_messages g where g.event_id = event_group_messages.event_id)
      or exists (select 1 from public.events e where e.id = event_group_messages.event_id and e.organizer_id = auth.uid())
    )
  );

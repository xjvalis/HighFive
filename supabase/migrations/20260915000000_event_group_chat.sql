-- Real group chat per event, shared by the organizer and every participant —
-- distinct from public.direct_messages (strictly 1:1) and from
-- public.comments (public discussion, visible to non-participants too).
-- The organizer must send the first message (founds the chat); once it
-- exists, any member (participant or organizer) can reply into it.
create table public.event_group_messages (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null,
  author_email text not null,
  author_name text,
  author_avatar text,
  content text not null,
  created_at timestamptz default now()
);

create index event_group_messages_event_id_idx on public.event_group_messages(event_id);

alter table public.event_group_messages enable row level security;

-- Organizer or a joined participant — checked against events.participants
-- (email) rather than a join table, matching how join-event stores attendance.
create or replace function public.is_event_member(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.events e
    left join public.user_profiles up on up.user_id = p_user_id
    where e.id = p_event_id
      and (e.organizer_id = p_user_id or (up.user_email is not null and up.user_email = any(e.participants)))
  );
$$;

create policy "group_messages_read_members" on public.event_group_messages
  for select using (
    public.is_event_member(event_id, auth.uid())
    or public.is_admin(auth.uid())
  );

create policy "group_messages_insert_members" on public.event_group_messages
  for insert with check (
    author_id = auth.uid()
    and public.is_event_member(event_id, auth.uid())
    and (
      -- chat already founded, or this insert is the organizer founding it
      exists (select 1 from public.event_group_messages g where g.event_id = event_group_messages.event_id)
      or exists (select 1 from public.events e where e.id = event_group_messages.event_id and e.organizer_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.event_group_messages;

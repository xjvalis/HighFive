-- Spoluvíc — Supabase Schema
-- Spusť celé toto v Supabase → SQL Editor → New query → Run

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis"; -- pro geo dotazy

-- ============================================================
-- TABULKY
-- ============================================================

-- Uživatelské profily (rozšíření Supabase auth.users)
create table public.user_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  user_email text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  location text,
  age integer,
  gender text check (gender in ('Muž', 'Žena', 'Jiné', 'Nechci uvádět')),
  favorite_categories text[] default '{}',
  joined_events uuid[] default '{}',
  favorited_events uuid[] default '{}',
  subscription_plan text default 'free' check (subscription_plan in ('free', 'plus', 'creator')),
  is_premium boolean default false,
  is_verified boolean default false,
  is_admin boolean default false,
  is_moderator boolean default false,
  is_banned boolean default false,
  reliability_score integer default 100,
  noshow_count integer default 0,
  monthly_join_count integer default 0,
  monthly_create_count integer default 0,
  monthly_reset_date date,
  monthly_joined_event_ids uuid[] default '{}',
  stripe_subscription_id text,
  stripe_customer_id text,
  notify_email_reminders boolean default true,
  notify_email_event_updates boolean default true,
  push_token text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Události
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  category text not null,
  location text not null,
  latitude double precision,
  longitude double precision,
  date timestamptz not null,
  end_time timestamptz,
  max_capacity integer,
  participants text[] default '{}',   -- pole emailů
  waitlist text[] default '{}',        -- pole emailů
  image_url text,
  organizer_id uuid references auth.users(id) on delete set null,
  organizer_email text not null,
  organizer_name text,
  organizer_avatar text,
  is_featured boolean default false,
  is_approved boolean default true,
  is_reported boolean default false,
  report_reason text,
  is_suspended boolean default false,
  suspension_reason text,
  comments_count integer default 0,
  favorites_count integer default 0,
  attendance_marked boolean default false,
  attendees_present text[] default '{}',
  age_min integer,
  age_max integer,
  gender_recommendation text default 'Everyone' check (gender_recommendation in ('Everyone', 'M', 'F', 'M+F')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Přímé zprávy (1:1 i hromadné oznámení organizátora — is_broadcast rozlišuje)
create table public.direct_messages (
  id uuid primary key default uuid_generate_v4(),
  from_id uuid references auth.users(id) on delete set null,
  from_email text not null,
  from_name text,
  from_avatar text,
  to_id uuid references auth.users(id) on delete set null,
  to_email text not null,
  event_id uuid references public.events(id) on delete set null,
  event_title text,
  is_broadcast boolean default false,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Skupinový chat k akci — sdílený organizátorem a všemi účastníky (na rozdíl
-- od direct_messages, což je striktně 1:1, a comments, což je veřejná
-- diskuze viditelná i nepřihlášeným). Organizátor musí poslat první zprávu
-- (založí chat); pak může psát kdokoliv z účastníků. Viz RLS níže.
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

-- Notifikace
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  user_email text not null,
  type text not null check (type in (
    'event_reminder', 'event_updated', 'new_participant',
    'waitlist_promoted', 'new_report', 'new_message', 'new_chat_message',
    'event_past', 'noshow_warning', 'event_suspended',
    'reliability_reset_request', 'reliability_reset_done'
  )),
  -- Legacy frozen strings — old rows only. Current inserts leave these null
  -- and put structured params in `data`; rendering picks whichever is present
  -- (see src/lib/notifTemplates.js), so the reader always gets their own
  -- language instead of whoever triggered the notification.
  title text,
  body text,
  data jsonb,
  event_id uuid references public.events(id) on delete set null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Komentáře
create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null,
  author_email text not null,
  author_name text,
  author_avatar text,
  content text not null,
  is_reported boolean default false,
  created_at timestamptz default now()
);

-- Hlášení
create table public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_email text not null,
  target_id text not null,
  target_type text not null check (target_type in ('event', 'comment', 'user')),
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz default now()
);

-- ============================================================
-- INDEXY
-- ============================================================
create index events_organizer_email_idx on public.events(organizer_email);
create index events_category_idx on public.events(category);
create index events_date_idx on public.events(date);
create index events_is_approved_idx on public.events(is_approved);
create index events_location_idx on public.events using gist (
  st_point(longitude, latitude)
) where latitude is not null and longitude is not null;
create index events_approved_date_idx on public.events (is_approved, date);
create index events_participants_gin_idx on public.events using gin (participants);

create index direct_messages_from_email_idx on public.direct_messages(from_email);
create index direct_messages_to_email_idx on public.direct_messages(to_email);
create index event_group_messages_event_id_idx on public.event_group_messages(event_id);
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_is_read_idx on public.notifications(user_id, is_read);
create index comments_event_id_idx on public.comments(event_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.events enable row level security;
alter table public.direct_messages enable row level security;
alter table public.event_group_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- is_admin() exists specifically so RLS policies can check admin status
-- without querying user_profiles directly from within a policy defined ON
-- user_profiles — that self-reference causes Postgres to re-evaluate the
-- same RLS policy for the subquery, which re-triggers itself, infinitely
-- ("infinite recursion detected in policy for relation user_profiles").
-- SECURITY DEFINER makes this function's own internal lookup bypass RLS
-- entirely, breaking the cycle. Policies on OTHER tables that check
-- is_admin may keep their inline subquery — it's only self-reference (a
-- policy on user_profiles querying user_profiles) that recurses — but using
-- this function there too is cheaper and consistent.
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.user_profiles where user_id = p_user_id), false);
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon;

-- USER PROFILES
-- Full-row reads (incl. stripe_customer_id/stripe_subscription_id/push_token)
-- are restricted to the row owner and admins. Everyone else reads through
-- public.user_profiles_public below, which exposes only the display-safe
-- columns the app actually needs for other users.
create policy "profiles_read_own_or_admin" on public.user_profiles
  for select using (
    auth.uid() = user_id or public.is_admin(auth.uid())
  );

create policy "profiles_insert_own" on public.user_profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.user_profiles
  for update using (auth.uid() = user_id);

-- Admins need to update OTHER users' rows for moderation (ban, reliability
-- reset) — without this, those actions silently affect 0 rows under RLS.
create policy "profiles_update_admin" on public.user_profiles
  for update using (
    public.is_admin(auth.uid())
  );

create policy "profiles_delete_own" on public.user_profiles
  for delete using (auth.uid() = user_id);

-- profiles_update_own has no column-level restriction, so on its own it lets
-- a user PATCH their own row and set is_admin/is_premium/subscription_plan/
-- reliability_score/etc directly — a full self-service privilege escalation
-- (every admin-gated policy in this file trusts is_admin on this table).
-- This trigger locks those columns to their previous value whenever the
-- session doing the update IS the row's own owner (auth.uid() = old.user_id):
-- normal self-edits (display_name, bio, favorite_categories, ...) pass
-- through untouched, privileged columns cannot be changed by the user
-- themselves. Admin updates (profiles_update_admin, different auth.uid())
-- and service-role writes (Stripe webhook, auth.uid() is null) are unaffected.
create or replace function public.protect_privileged_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.user_id then
    new.is_admin := old.is_admin;
    new.is_moderator := old.is_moderator;
    new.is_banned := old.is_banned;
    new.is_verified := old.is_verified;
    new.is_premium := old.is_premium;
    new.subscription_plan := old.subscription_plan;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.reliability_score := old.reliability_score;
    new.noshow_count := old.noshow_count;
    new.monthly_join_count := old.monthly_join_count;
    new.monthly_create_count := old.monthly_create_count;
    new.monthly_reset_date := old.monthly_reset_date;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_privileged_profile_fields on public.user_profiles;
create trigger protect_privileged_profile_fields
  before update on public.user_profiles
  for each row execute function public.protect_privileged_profile_fields();

-- EVENTS
create policy "events_read_approved" on public.events
  for select using (
    is_approved = true
    or organizer_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "events_insert_auth" on public.events
  for insert with check (auth.uid() = organizer_id);

create policy "events_update_own_or_admin" on public.events
  for update using (
    organizer_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "events_delete_own_or_admin" on public.events
  for delete using (
    organizer_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- events.comments_count / events.favorites_count are denormalized counters
-- maintained only by these triggers — never by a direct client .update().
-- comments_count in particular can't be: events_update_own_or_admin only lets
-- the organizer touch the row, but anyone can comment on it.
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

-- DIRECT MESSAGES
create policy "dm_read_own" on public.direct_messages
  for select using (
    from_id = auth.uid()
    or to_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "dm_insert_auth" on public.direct_messages
  for insert with check (from_id = auth.uid());

create policy "dm_update_recipient" on public.direct_messages
  for update using (to_id = auth.uid());

-- EVENT GROUP CHAT
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

-- NOTIFICATIONS
create policy "notif_read_own" on public.notifications
  for select using (
    user_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "notif_insert_auth" on public.notifications
  for insert with check (auth.role() = 'authenticated');

create policy "notif_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- COMMENTS
create policy "comments_read_auth" on public.comments
  for select using (auth.role() = 'authenticated');

create policy "comments_insert_auth" on public.comments
  for insert with check (author_id = auth.uid());

create policy "comments_delete_own_or_admin" on public.comments
  for delete using (
    author_id = auth.uid()
    or public.is_admin(auth.uid())
  );

-- REPORTS
create policy "reports_insert_auth" on public.reports
  for insert with check (auth.role() = 'authenticated');

create policy "reports_read_admin" on public.reports
  for select using (
    public.is_admin(auth.uid())
  );

create policy "reports_update_admin" on public.reports
  for update using (
    public.is_admin(auth.uid())
  );

-- ============================================================
-- REALTIME — povol realtime pro tyto tabulky
-- ============================================================
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.event_group_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.comments;

-- ============================================================
-- TRIGGER — auto-vytvoř profil při registraci
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, user_email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- HELPER FUNKCE — vzdálenost v km (haversine)
-- ============================================================
create or replace function public.events_within_radius(
  user_lat double precision,
  user_lng double precision,
  radius_km double precision
)
returns setof public.events as $$
  select * from public.events
  where is_approved = true
  and latitude is not null
  and longitude is not null
  and (
    6371 * acos(
      cos(radians(user_lat)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(latitude))
    )
  ) <= radius_km;
$$ language sql stable;

-- ============================================================
-- SAFE PUBLIC PROFILE VIEW
-- ============================================================
-- Display-safe subset of user_profiles for looking up OTHER users (DM
-- partners, event participants, admin/moderator lookup for reports) —
-- excludes stripe_customer_id/stripe_subscription_id/push_token/monthly_*/
-- joined_events/favorited_events, which stay restricted to the row owner
-- and admins via user_profiles' own RLS. Runs with the view owner's
-- privileges (created via the SQL editor as `postgres`, which bypasses
-- RLS), so it can expose these columns for every row regardless of the
-- querying user's own row-level access.
create or replace view public.user_profiles_public as
select
  user_id, user_email, display_name, avatar_url, bio, location, age, gender,
  favorite_categories, subscription_plan, is_premium, is_verified, is_admin,
  is_moderator, reliability_score, noshow_count, created_at
from public.user_profiles;

grant select on public.user_profiles_public to authenticated;

-- ============================================================
-- ATTENDANCE / NO-SHOW PENALTY (server-validated)
-- ============================================================
-- Applying a no-show penalty writes another user's reliability_score/
-- noshow_count — never safe as a direct client update (nothing would stop
-- an organizer from tanking any participant's score with zero
-- verification). This function checks the caller actually organizes the
-- event and that it has started before touching anything.
create or replace function public.mark_event_attendance(p_event_id uuid, p_present_emails text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_email text;
  v_profile record;
begin
  select * into v_event from public.events where id = p_event_id;
  if v_event is null then
    raise exception 'event not found';
  end if;
  if v_event.organizer_id is distinct from auth.uid() then
    raise exception 'only the organizer can mark attendance';
  end if;
  if v_event.date > now() then
    raise exception 'event has not started yet';
  end if;

  update public.events
  set attendance_marked = true, attendees_present = p_present_emails
  where id = p_event_id;

  foreach v_email in array coalesce(v_event.participants, '{}') loop
    if not (v_email = any(p_present_emails)) then
      select noshow_count, reliability_score, user_id into v_profile
      from public.user_profiles where user_email = v_email;

      if found then
        update public.user_profiles
        set noshow_count = coalesce(noshow_count, 0) + 1,
            reliability_score = greatest(0, coalesce(reliability_score, 100) - 15)
        where user_email = v_email;

        insert into public.notifications (user_id, user_email, type, data, event_id, is_read)
        values (v_profile.user_id, v_email, 'noshow_warning', jsonb_build_object('eventTitle', v_event.title), p_event_id, false);
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.mark_event_attendance(uuid, text[]) to authenticated;

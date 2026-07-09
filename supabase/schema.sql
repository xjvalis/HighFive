-- HighFive — Supabase Schema
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
  reliability_score integer default 100,
  noshow_count integer default 0,
  monthly_join_count integer default 0,
  monthly_create_count integer default 0,
  monthly_reset_date date,
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
  comments_count integer default 0,
  favorites_count integer default 0,
  age_min integer,
  age_max integer,
  gender_recommendation text default 'Everyone' check (gender_recommendation in ('Everyone', 'M', 'F', 'M+F')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Event chat (jen pro účastníky)
create table public.event_chat (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete set null,
  author_email text not null,
  author_name text,
  author_avatar text,
  content text not null,
  is_archived boolean default false,
  created_at timestamptz default now()
);

-- Přímé zprávy
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
  content text not null,
  is_read boolean default false,
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
  title text not null,
  body text,
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

create index event_chat_event_id_idx on public.event_chat(event_id);
create index direct_messages_from_email_idx on public.direct_messages(from_email);
create index direct_messages_to_email_idx on public.direct_messages(to_email);
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_is_read_idx on public.notifications(user_id, is_read);
create index comments_event_id_idx on public.comments(event_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.user_profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_chat enable row level security;
alter table public.direct_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- USER PROFILES
create policy "profiles_read_all" on public.user_profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert_own" on public.user_profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.user_profiles
  for update using (auth.uid() = user_id);

create policy "profiles_delete_own" on public.user_profiles
  for delete using (auth.uid() = user_id);

-- EVENTS
create policy "events_read_approved" on public.events
  for select using (
    is_approved = true
    or organizer_id = auth.uid()
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "events_insert_auth" on public.events
  for insert with check (auth.role() = 'authenticated');

create policy "events_update_own_or_admin" on public.events
  for update using (
    organizer_id = auth.uid()
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "events_delete_own_or_admin" on public.events
  for delete using (
    organizer_id = auth.uid()
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

-- EVENT CHAT — jen účastníci vidí zprávy
create policy "event_chat_read_participants" on public.event_chat
  for select using (
    -- user je účastník eventu
    exists (
      select 1 from public.events e
      where e.id = event_id
      and (
        auth.jwt()->>'email' = any(e.participants)
        or e.organizer_id = auth.uid()
      )
    )
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "event_chat_insert_participants" on public.event_chat
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
      and (
        auth.jwt()->>'email' = any(e.participants)
        or e.organizer_id = auth.uid()
      )
    )
  );

-- DIRECT MESSAGES
create policy "dm_read_own" on public.direct_messages
  for select using (
    from_id = auth.uid()
    or to_id = auth.uid()
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "dm_insert_auth" on public.direct_messages
  for insert with check (from_id = auth.uid());

create policy "dm_update_recipient" on public.direct_messages
  for update using (to_id = auth.uid());

-- NOTIFICATIONS
create policy "notif_read_own" on public.notifications
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
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
    or exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

-- REPORTS
create policy "reports_insert_auth" on public.reports
  for insert with check (auth.role() = 'authenticated');

create policy "reports_read_admin" on public.reports
  for select using (
    exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

create policy "reports_update_admin" on public.reports
  for update using (
    exists (select 1 from public.user_profiles where user_id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- REALTIME — povol realtime pro tyto tabulky
-- ============================================================
alter publication supabase_realtime add table public.event_chat;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.events;

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

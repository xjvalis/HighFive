-- Spusť v Supabase → SQL Editor → New query → Run
-- 1) Rozšíří seznam povolených typů notifikací o ty, které kód už reálně
--    posílá (reliability_reset_*, event_past, noshow_warning, event_suspended),
--    ale check constraint je zatím neobsahoval.
-- 2) Přidá sloupec pro push notification token (příprava na mobilní push).
-- Obojí je nedestruktivní — nic nemaže ani nepřepisuje existující data.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'event_reminder', 'event_updated', 'new_participant',
    'waitlist_promoted', 'new_report', 'new_message', 'new_chat_message',
    'event_past', 'noshow_warning', 'event_suspended',
    'reliability_reset_request', 'reliability_reset_done'
  ));

alter table public.user_profiles add column if not exists push_token text;
alter table public.user_profiles add column if not exists is_moderator boolean default false;
alter table public.user_profiles add column if not exists reliability_score integer default 100;
alter table public.user_profiles add column if not exists noshow_count integer default 0;

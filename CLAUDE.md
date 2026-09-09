# Spoluvíc

Czech social/event-discovery app: find what's happening nearby today, join without a
profile-building ritual. React 18 + Vite + Capacitor (Android/iOS) + Supabase
(Postgres/Auth/Storage/Realtime/Edge Functions) + Stripe + Sentry. Live at
https://high-five-nine.vercel.app, deployed on Vercel (every push to `main` ships to
production — there is no staging environment).

## Where things live

- `src/pages/` — one file per route (`Home.jsx`, `EventDetail.jsx`, `Profile.jsx`, …),
  wired up in `src/App.jsx`.
- `src/components/` — subdivided by domain: `events/`, `layout/`, `profile/`,
  `messages/`, `premium/`, `brand/`, `icons/`, plus a generic `ui/` for shadcn-style
  primitives (`button.jsx`, `dialog.jsx`, …).
- `src/lib/` — cross-cutting utilities with no React in them: `supabaseClient.js`,
  `categories.js`, `geocoding.js`, `i18n.js`, `notifTemplates.js`, `svStyles.js`
  (shared design-token style objects — see below).
- `src/hooks/`, `src/contexts/` — `CurrentUserContext` is the one context; most state
  is local or fetched per-page.
- `supabase/` — `schema.sql` is the full current schema (reference/fresh-install use);
  `supabase/migrations/*.sql` is the append-only history — **every schema change from
  now on is a new migration file, never an edit to schema.sql or an old migration in
  place** (see "Database schema changes" below). `supabase/functions/*/index.ts` are
  the edge functions (Deno).
- `@/` resolves to `src/` (see `vite.config.js` / `jsconfig.json`) — always import via
  the alias, not relative `../../..` paths.

## Design system

The whole UI runs on `--sv-*` CSS custom properties defined in `src/index.css`
(colors, radii, spacing) plus `src/lib/svStyles.js` (shared inline-style objects:
`svCard`, `svField`, `svLabel`, `svMeta`, `svPageTitle`, `svActionPill`, `svQuietPill`,
`svSectionLabel`). **Reuse these instead of re-deriving a near-identical style object
in a new page** — that's exactly the kind of drift that makes a later token change
miss files. `src/components/icons/SvIcon.jsx` is the line-icon set (16×16, stroke 1.2).
Category colors/emoji/labels live in `src/lib/categories.js` — the `name` field is the
literal string stored in `events.category`, never rename it.

Rules carried over from the original design handoff, still binding: no emoji outside
category tags/labels, no drop shadows on cards, category color only tints
tag/tile/dot — never headings or button text, `--sv-meta` (#8C8790) is the lightest
gray allowed for body text.

## Security model — read this before touching auth, profiles, or money

- **RLS is the real boundary, not the client code.** Anything the anon key can reach is
  reachable by anyone, regardless of what the React UI happens to request — a client
  omitting a sensitive column from a `.select()` is not a security control.
- **`user_profiles` is split in two:**
  - The base table (`stripe_customer_id`, `stripe_subscription_id`, `push_token`,
    `monthly_*`, `is_admin`, `reliability_score`, …) is readable/writable only by the
    row's own owner or an admin (`profiles_read_own_or_admin`,
    `profiles_update_own` + `profiles_update_admin`).
  - `public.user_profiles_public` (a view) is what everything else — DM partner
    lookups, event participant lists, admin/moderator lookups — reads from. It only
    exposes display-safe columns. **When you need another user's profile data for
    anything other than the current user's own settings page or an admin action,
    query the view, not the table.**
  - A trigger (`protect_privileged_profile_fields`) locks `is_admin`/`is_premium`/
    `subscription_plan`/`reliability_score`/Stripe IDs/etc. to their previous value
    whenever a user updates their *own* row — otherwise `profiles_update_own`'s
    ownership check alone would let anyone grant themselves admin via a raw PATCH.
    Don't relax this without understanding why it's there (see git history:
    "Fix critical privilege-escalation RLS gap").
- **Writes that affect another user's trust/standing (reliability score, no-show
  count, ban status) never go through a direct client `.update()`.** They go through
  a `SECURITY DEFINER` Postgres function that validates the caller's relationship to
  the target first (see `mark_event_attendance` in `supabase/schema.sql`). If you add
  a new feature that needs to touch another user's profile, follow that pattern —
  write a function, don't loosen RLS to let the client do it directly.
- **`create-event` and any other edge function that inserts/updates from a client
  payload must whitelist fields explicitly** (`const { title, description, ... } =
  rawPayload`), never `{...rawPayload}` — otherwise a caller can set columns the UI
  never exposes (`is_featured`, `is_approved`, counters, …).
- **Known, deliberately-not-yet-fixed gap:** `notifications` INSERT is open to any
  authenticated user for any `user_id` (`notif_insert_auth`). This is relied on by a
  few legitimate self-service flows (event reminders to participants, reliability
  reset requests to admins) that run client-side rather than through a function. It's
  a spam/annoyance vector, not an account or data-integrity one — closing it properly
  means moving those specific writes into `SECURITY DEFINER` functions like
  `mark_event_attendance`, not a blanket RLS tightening (that breaks the legitimate
  cases too). Do this before relying on notifications for anything trust-sensitive.

## Database schema changes

1. Write a new file: `supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`.
2. Run it in the Supabase SQL editor against the live project (or `supabase db push`
   once you've confirmed the CLI is linked to the right project —
   `supabase/.temp/project-ref`).
3. Update `supabase/schema.sql` to match (it should always reflect the live schema in
   full — it drifted behind live changes before and caused real confusion; don't let
   that happen again).
4. If the change affects RLS/columns something in `src/` reads or writes, update that
   code in the same commit as the migration.

## Testing

`npm test` runs Vitest + React Testing Library (`src/**/*.test.{js,jsx}`). Coverage is
intentionally thin, not comprehensive — it exists for the highest-risk logic
(category fallback behavior, geocoding provider fallback/response-shape parsing, the
EventCard full/joined visibility rule that broke once already). When you fix a bug,
add the regression test in the same commit, the way the existing tests document past
bugs. `npm run typecheck` exists but is **not** currently passing and is **not**
wired into CI — checkJs surfaces ~40 pre-existing prop-shape mismatches unrelated to
any one change. Fix those before re-enabling it as a gate; until then, don't treat a
clean `npm run build` as proof the types line up.

## CI

`.github/workflows/ci.yml` runs lint, test, and build on every push/PR to `main`. It
does not run `typecheck` (see above) and does not deploy anything — Vercel's own git
integration builds and deploys `main` independently of this workflow.

## Versioning

`package.json`'s `version` field and the Android `versionCode`/`versionName` in
`android/app/build.gradle` are unrelated and not auto-synced — bump both by hand when
you actually cut a release, and note what changed (this repo doesn't have a
CHANGELOG yet; consider starting one before the first real release).

## Known deferred items (audited, not yet fixed — don't assume these are fine)

- `react-router-dom` has two known moderate CVEs fixed only in v7; the app is on v6.
  The v6→v7 API surface has real breaking changes (data APIs, some hook behavior) —
  upgrade deliberately with its own test pass, don't force it in an unrelated change.
- No uptime/analytics monitoring beyond Sentry (errors + 10% perf sampling). No
  server-side log aggregation for edge functions beyond Supabase's own function logs.
- Main JS bundle is code-split by vendor (`vite.config.js` `manualChunks`) but still
  large; further route-level splitting would help first paint on slower connections.

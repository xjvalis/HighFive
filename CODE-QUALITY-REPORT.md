# Code Quality Report — Spoluvíc

Human-engineering review, written as if taking ownership of this codebase from
another senior engineer. Security is explicitly out of scope here (covered
separately). Every finding below was checked against the actual code, not
inferred from patterns — file:line references point at real code as of this
review (2026-09-10).

**Overall read:** this is a better codebase than the prompt's checklist implied.
No eslint-disable/ts-ignore anywhere, no exhaustive-deps suppressions, no
unnecessary React state, no effect-driven state sync, naming is mostly
disciplined, and a handful of comments genuinely explain non-obvious WHY
(RLS gotchas, backwards-compat decisions) rather than padding. The real
problem is **one specific kind of duplication, repeated at scale**: a handful
of business rules (is-event-full, is-event-over, the free-tier monthly-limit
check) got hand-copied into every place that needed them instead of being
extracted once, early — the classic cost of moving fast without a second
pass. That's the one thing worth a deliberate refactor. Everything else is
small, cheap cleanup.

---

## REMOVE

Dead code and unused dependencies. Deleting these has no behavioral risk —
confirmed zero references before listing anything here.

| Item | Where | Why |
|---|---|---|
| `UserNotRegisteredError.jsx` | `src/components/UserNotRegisteredError.jsx` | Defined, exported, never imported anywhere. |
| `createPageUrl()` | `src/utils/index.ts` (whole file — it's the only export) | Zero call sites. Delete the file. |
| `isIframe` | `src/lib/utils.js:9` | Exported, zero consumers. |
| `export` on `TYPE_ICONS` | `src/lib/notifTemplates.js:17` | Only used inside the same file (line 29) — drop the `export` keyword, keep the const. |
| `@base44/vite-plugin` | `package.json` deps | Not referenced in `vite.config.js` or anywhere in `src/` — leftover from the original scaffold. |
| `react-hook-form`, `@hookform/resolvers`, `zod` | `package.json` deps | All forms in the app are hand-rolled `useState`; no `ui/form.jsx` wrapper exists, zero imports. Three packages for a form stack that was never adopted. |
| `@hello-pangea/dnd` | `package.json` deps | No drag-and-drop UI anywhere. |
| `react-markdown` | `package.json` deps | No `<ReactMarkdown>` usage. |
| `react-resizable-panels` | `package.json` deps | No usage. |
| `@radix-ui/react-tabs` | `package.json` deps | No `ui/tabs.jsx` wrapper, no direct import. |
| Two `Promise.resolve({ data: [] })` placeholders + `_unused1`/`_unused2` | `src/pages/MyEvents.jsx:65-74` | Exist only to keep positional destructuring aligned in a `Promise.all` — indirection with no purpose. Would a good engineer write this? No — two plain fetches (or an object instead of positional array) removes both the placeholders and the throwaway variable names. |

**Not removing, despite looking like debt:** the `[DOPLNIT: ...]` TODO
placeholders in `src/pages/Terms.jsx:4` and `src/pages/Privacy.jsx:4`. These
are accurate, load-bearing warnings (the legal pages are templated, not
launch-ready) — deleting or "resolving" the comment without actually filling
in the legal identity would be worse than leaving it. Product/legal
follow-up, not a code-quality issue.

---

## REFACTOR

The one category worth real effort. All of these are "the formula is right,
it's just copied everywhere" — not bugs today, but the kind of duplication
that silently drifts the day someone changes one copy and misses the rest.

### 1. Business rules duplicated across the client/server boundary (highest priority)

**"Is this event full"** (`event.max_capacity && count >= event.max_capacity`)
is reimplemented independently in at least 8 places: `EventCard.jsx:26`,
`EventMap.jsx:94`, `OrganizerEventCard.jsx:32`, `EventDetail.jsx:84`,
`Home.jsx:169`, `RightSidebar.jsx:86`, `Trending.jsx:21`,
`ShareEventButton.jsx:135`, plus the server's own copy in
`supabase/functions/join-event/index.ts:83`.

**"Is this event over"** (`end_time ?? date + 2h`, compared to `now()`) is
reimplemented in `Home.jsx:143`, `MyEvents.jsx:82`, `Trending.jsx:12-14` —
`Trending.jsx` even carries a comment acknowledging it's mirroring
Home/MyEvents' rule rather than sharing it.

**The free-tier monthly-limit check** (`isNewMonth = !reset ||
now.getFullYear()>reset.getFullYear() || now.getMonth()>reset.getMonth()`,
then compared against a join/create count) is implemented **nine times**:
client — `Home.jsx:173-175` *and* `Home.jsx:293-295` (two copies in the same
file), `EventDetail.jsx:89-95` *and* `EventDetail.jsx:212-214` (two copies in
the same file), `CreateEvent.jsx:46-52`; server (authoritative) —
`supabase/functions/join-event/index.ts:98-100,114-116`,
`supabase/functions/create-event/index.ts:53-55,81-83`. The magic numbers `3`
(monthly joins) and `1` (monthly creates) are hardcoded at every one of those
call sites, plus again in `Profile.jsx:128`'s display copy.

None of this has drifted yet — every copy currently agrees. That's exactly
the risk: there is no single place to change the join limit from 3 to 5.
**Fix:** extract `isEventFull(event)`, `isEventOver(event)` into
`src/lib/events.js`, and a `MONTHLY_JOIN_LIMIT` / `MONTHLY_CREATE_LIMIT`
constant + a shared `getFreeTierUsage(profile)` helper into
`src/lib/premium.js`, used by all client call sites. The server copies in the
edge functions stay — they're the authoritative enforcement and live in a
different runtime — but should import the same constants if the two Deno
functions can share a module, or at minimum carry a comment pointing at the
client constant so the numbers don't silently diverge.

### 2. Silent failure on admin moderation actions

`src/pages/AdminDashboard.jsx:88` and `:111` — bare `catch (_) {}` around the
"ban user" and "suspend event" notification steps. If the notification insert
fails, the admin sees a success toast for an action that partially failed,
with zero trace. These are the highest-stakes actions in the app (they affect
another person's account/content) — swallowing the error here is not
something a careful engineer would choose deliberately once they thought
about who's on the other end of the failure. Log it and/or downgrade the
success toast to reflect partial failure.

### 3. Duplicated hex colors that already have a token

`#F0EAFC` (the light-purple tint used for avatar backgrounds and the
Komunita card) is hardcoded as a literal 15 times across 9 files
(`categories.js`, `AdminDashboard.jsx`, `EventDetail.jsx` ×3,
`Messages.jsx` ×3, `Profile.jsx` ×3, `SendDMModal.jsx`, `TopNav.jsx`,
`RightSidebar.jsx`, `MobileBottomNav.jsx`), and its paired ink color
`#4A3A73` another 5 times — despite every *other* color in the design system
going through a `--sv-*` CSS variable (`var(--sv-brand-purple)` is even used
right next to the literal `#F0EAFC` in the same style objects). This reads
like the token was added after most of these call sites were already
written, and nobody went back to swap them. **Fix:** add `--sv-brand-purple-bg:
#F0EAFC` and `--sv-brand-purple-ink: #4A3A73` to `src/index.css`, replace all
20 occurrences.

### 4. Hardcoded Czech-only error strings breaking the i18n convention

`src/pages/MyEvents.jsx:76,93,106` — three `toast.error(...)` calls with
Czech-only literal strings, while every other error path in the codebase
(including two other handlers in this same file) uses the
`lang === 'cs' ? '...' : '...'` pattern. An English-language user hits a
Czech error message here. Looks like an oversight from a later edit, not a
deliberate choice — fix by matching the surrounding convention.

---

## SIMPLIFY

Real but lower-stakes inconsistencies — worth doing opportunistically, not
worth a dedicated pass.

- **No shared query layer.** Every page hand-rolls its own Supabase query;
  `.eq('is_approved', true).gt('date', now)` is repeated across
  `RightSidebar.jsx` (3 times in one file), `Trending.jsx`, and 5 sort-mode
  variants in `Home.jsx`. The `user_profiles_public` lookup-by-email pattern
  (`.select('user_id').eq('user_email', email).maybeSingle()`) is copy-pasted
  in `ParticipantsPanel.jsx`, `SendDMModal.jsx`, `OrganizerEventCard.jsx`,
  `Messages.jsx`. Not urgent at this scale, but a `src/lib/queries/events.js`
  (or a couple of small hooks) would be a cheap, low-risk win next time one
  of these files is touched anyway.
- **Three different loading-UI idioms with no shared convention**: the
  shared `Skeleton` component (`src/components/ui/skeleton.jsx`) is used in
  exactly one place (`Home.jsx`); everywhere else it's either an inline
  `Loader2` spin or a hand-rolled `<div className="border-2 animate-spin">`
  with its own one-off size/color (`App.jsx:64`, `Home.jsx:244`, several
  page-level "loading" early-returns). Pick one pattern for page-level
  loading and one for inline-button loading, apply consistently.
- **Inconsistent optimistic-update coverage** for what's conceptually the
  same action: `Home.jsx`'s favorite/join handlers do a real optimistic
  update with a ref-based double-submit guard; the equivalent actions in
  `EventDetail.jsx` and `ParticipantsPanel.jsx` don't have the same
  treatment, so the same feature feels snappier on one screen than another.
- **`handleX` naming isn't applied uniformly**: `EventCard.jsx` and
  `ParticipantsPanel.jsx` use `handleJoinClick`/`handlePromote`/etc.
  consistently; `OrganizerEventCard.jsx` uses bare verbs (`sendMessage`,
  `sendReminder`) for equivalent async action handlers. Minor, but visible
  side-by-side.
- **A few filler comments** that just restate the next line —
  `AdminDashboard.jsx:77,99,138` (`// Notify organizer`), `SearchPage.jsx:37`
  (`// Focus input when opened`). Harmless, but add nothing; safe to delete
  next time those lines are touched.

---

## KEEP

Explicitly calling these out so they don't get "fixed" by a future pass that
mistakes them for problems — they're either fine as-is or a genuine strength.

- **No unnecessary React state, no effect-driven state sync, no redundant
  effects.** Derived values (`isJoined`, `isFull`, `isOrganizer`, etc.) are
  correctly computed as plain `const` per render across `EventDetail.jsx`,
  `Home.jsx`, and elsewhere — never stashed in `useState` + a syncing effect.
  `Profile.jsx:49`'s `useEffect(() => { if (profile) setForm(profile) },
  [profile])` looks like the anti-pattern at a glance but isn't — `form` is a
  genuinely independent editable draft, not a mirror of `profile`.
- **Zero eslint-disable / @ts-ignore / @ts-nocheck anywhere.** No suppressed
  lint rules, no papered-over type errors. Whatever else is true of this
  codebase, nobody has been silencing the tools instead of fixing the code.
- **Naming discipline is better than expected.** Boolean naming (`isX`) is
  applied consistently; DB snake_case (`max_capacity`) is kept as-is through
  form state and props rather than being inconsistently re-cased; no
  `isX`/`hasX` confusion found across the files sampled.
- **A real vein of good, WHY-focused comments** — `OrganizerEventCard.jsx:39-43`
  (explains the exact RLS gotcha that silently breaks the "message all
  participants" feature if the `to_id` lookup is skipped),
  `AdminDashboard.jsx:40-42` (explains why counts are fetched separately from
  paged rows), `Login.jsx:36-39` (a native cold-start retry rationale),
  `notifTemplates.js:4-15` / `useNotificationEngine.js:4-10` (explain the
  legacy-data backwards-compat decision behind keeping the
  `new_chat_message` type name after the chat feature itself was removed).
  These read like a senior engineer leaving real notes, not filler — don't
  strip them out in a "clean up comments" pass.
- **`ShareEventButton.jsx`'s 306 lines / 107-line `generateShareCanvas()`**
  is not a giant-function problem — it's canvas text-wrapping and
  image-drawing boilerplate, which is inherently dense and doesn't have
  multiple responsibilities tangled together. Splitting it up would scatter
  one coherent algorithm across files for no real gain.
- **`CurrentUserContext.jsx` is tightly scoped** — holds `user`/`profile`/
  `loading` and exposes `updateProfile`, nothing more. It has *not* absorbed
  the premium-limit business logic that's scattered elsewhere (see REFACTOR
  #1) — which is itself a reasonable place to eventually hang the shared
  `getFreeTierUsage(profile)` helper once it exists, since the context
  already owns `profile`.
- **The client-side copies of the monthly-limit / is-full checks are UI-only
  and never the sole enforcement.** Every join/create path still calls the
  edge function, which re-checks server-side and is what actually decides
  (`EventDetail.jsx:107` explicitly handles the server's
  `monthly_limit_reached` response as the real gate). The duplication is a
  maintainability problem (REFACTOR #1), not a security or correctness bug.

---

## What's *not* here

Giant page components (`Home.jsx`, `EventDetail.jsx`, `Profile.jsx`,
`AdminDashboard.jsx`, `CreateEvent.jsx`, all 280-345 lines mixing
fetch/mutate/business-rules/JSX in one function) were flagged during
research but are deliberately **not** put in REFACTOR here: splitting a
280-line component that's read top-to-bottom once a feature and rarely
touched isn't worth the churn on its own. If REFACTOR #1 above happens
first (pulling the business-rule logic out into `src/lib/events.js` /
`src/lib/premium.js`), most of these pages shrink by 15-20 lines each as a
side effect, for free — that's the right order to do it in, not a
dedicated "split the big files" project.

---

## Applied in this pass

Everything below was actually done (lint + test + build green after each, one
new regression/behavior test added per new shared module, spot-checked live
against real data in-browser afterward — not just claimed):

**REMOVE** — `UserNotRegisteredError.jsx`, `src/utils/index.ts` (dead
`createPageUrl`), `isIframe`, the unnecessary `export` on `TYPE_ICONS`, the
two `Promise.resolve` placeholders + `_unused1`/`_unused2` in `MyEvents.jsx`,
and nine unused npm dependencies (`@base44/vite-plugin`, `react-hook-form`,
`@hookform/resolvers`, `zod`, `@hello-pangea/dnd`, `react-markdown`,
`react-resizable-panels`, `@radix-ui/react-tabs`) — all confirmed zero
references before deletion, not assumed from the description alone.

**REFACTOR #1** (business-rule duplication) — done in full: `src/lib/events.js`
(`isEventFull`, `isEventOver`) and `src/lib/premium.js` (`isPremiumProfile`,
`canJoinEvent`, `canCreateEvent`, `monthlyJoinsUsed`/`monthlyCreatesUsed`,
`MONTHLY_JOIN_LIMIT`/`MONTHLY_CREATE_LIMIT`), each with its own test file.
Every client call site listed above (`EventCard`, `EventMap`,
`OrganizerEventCard`, `Home`, `EventDetail`, `MyEvents`, `Trending`,
`CreateEvent`, `Profile`) now imports these instead of re-deriving the
formula. The server copies in `join-event`/`create-event` (Deno, can't import
from `src/`) are untouched and remain authoritative — documented in
`CLAUDE.md` as the one place that still needs manual sync if a limit changes.
As a side effect, `Profile.jsx`'s plan-usage display now actually applies the
month-rollover instead of showing the raw stored counter (a real, if minor,
staleness bug the duplication had been hiding).

**REFACTOR #2** (silent catches) — `AdminDashboard.jsx`'s ban/suspend actions
now `console.error` the organizer-notification failure instead of swallowing
it with `catch (_) {}`; the moderation action itself is unaffected either way.

**REFACTOR #3** (duplicated hex) — added `--sv-brand-purple-bg` /
`--sv-brand-purple-ink` to `src/index.css`; replaced all 19 literal
`'#F0EAFC'`/`'#4A3A73'` occurrences across 8 files. Left `categories.js`'s
`#F0EAFC` alone — that one is the Board Games category's own color, a
coincidental hex match, not the same design concept.

**REFACTOR #4** (i18n) — `MyEvents.jsx`'s three hardcoded Czech-only
`toast.error` strings now follow the `lang === 'cs' ? … : …` convention used
everywhere else in the file.

**Not applied — left for a deliberate follow-up, not silently dropped:**
the SIMPLIFY items (shared query layer, unifying the three loading-UI
idioms, optimistic-update coverage, `handleX` naming) are real but lower
severity and touch a lot of surface area for cosmetic gain; doing them
opportunistically the next time each file is touched is the better trade
than a dedicated pass right now.

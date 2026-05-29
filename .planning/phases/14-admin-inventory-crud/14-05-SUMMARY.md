---
phase: 14-admin-inventory-crud
plan: 05
subsystem: ui
tags: [react, nextjs, trpc, url-state, pagination, wardrobe, admin, sonner]

# Dependency graph
requires:
  - phase: 14-admin-inventory-crud
    plan: 01
    provides: "admin.wardrobe.list + admin.wardrobe.archive TRPC procedures, formatCurrencyFromCents helper"
  - phase: 14-admin-inventory-crud
    plan: 02
    provides: "DressStatusBadge, CategoryBadge, StatusFilterChips primitives"
provides:
  - "DressInventoryGrid client component: URL-stateful, paginated, multi-filter admin inventory grid for /admin/wardrobe"
  - "Reusable URL-state pattern for next/navigation searchParams: parse-with-default + special-case-default-elision + page-reset-on-filter-change"
affects:
  - 14-06-PLAN.md (consumer page wraps DressInventoryGrid in the admin page-header shell)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL-state filter persistence via Next.js useSearchParams + router.replace, with default-value elision to keep URLs clean"
    - "All-statuses-selected optimization: when every enum variant is checked, send statuses=undefined so the server skips the WHERE IN entirely"
    - "Debounced search via local input state + Enter/submit flush to URL (prevents per-keystroke URL churn)"
    - "Archive action via showDeleteConfirmation toast (NOT window.confirm) — consistent with the rest of the admin chrome"

key-files:
  created:
    - src/features/wardrobe/components/admin/DressInventoryGrid.tsx
  modified: []

key-decisions:
  - "URL-state for statuses + search + page. Refresh-survivable, deep-linkable, shareable. The complete view fits in the URL — server fetches are derived state, not source of truth."
  - "Default ['AVAILABLE'] selection drops the ?statuses= param entirely. Keeps the canonical first-load URL clean (`/admin/wardrobe`) and makes the URL grow only when the admin deviates from the default."
  - "All-7-statuses selected → send statuses=undefined, NOT the full array. Server's listInputSchema already treats undefined as 'no filter' which skips the WHERE IN, saving a tiny perf budget but more importantly matching the semantic intent ('show everything')."
  - "Archive UX deliberately reuses showDeleteConfirmation (with `Delete` button copy) but the toast message + procedure name read 'archive'. Archive IS the destructive action in MVP — there's no hard delete. Reusing the existing confirmation pattern keeps the trash-icon affordance familiar."
  - "ARCHIVED rows opacity-60 + hide-archive-button. You can't archive what's already archived; the row is still visible so admins can see the consequence of past archive actions (and can later unarchive via the edit page when 14-06 lands)."
  - "Search uses local input state (`useState`) flushed to URL on form submit/Enter — NOT URL-on-every-keystroke. Per-keystroke router.replace would push a history entry storm and re-trigger the TRPC query on every character."
  - "Page reset on every filter change (status toggle, search submit). When the filter set changes, page=N is meaningless because the result count changes. Reset to page 1 silently by deleting the page param."
  - "Card thumbnail uses plain `<img>` with biome-ignore (mirroring Plan 14-03 / DressImageGallery). Vercel Blob domain isn't in next.config images.remotePatterns yet — Phase 15 (public catalog) will revisit when image optimization matters."

patterns-established:
  - "next/navigation URL-state recipe: `const param = searchParams.get('k')`, mutate via `URLSearchParams(searchParams.toString())` + `router.replace(qs ? '?'+qs : '?', { scroll: false })`. Special-case default-equal values by deleting the key to keep URLs clean."
  - "Parse helpers that ALWAYS produce a valid typed value (here: parseStatusesParam returns at least `['AVAILABLE']` even when given garbage) so downstream consumers don't need null/empty guards."
  - "Result-card layout: aspect-square thumbnail with floating status badge top-right, navy title + category badge in the content header, owner email small-print, sizeLabel + competitionPrice row, counts + updatedAt row, Edit (flex-1) + ghost archive button divider row at the bottom."

# Metrics
duration: 2m 50s
completed: 2026-05-29
---

# Phase 14 Plan 05: Admin Inventory Grid Summary

**The most user-visible artifact in Phase 14 — one client component that turns the Plan 14-01 TRPC surface and the Plan 14-02 primitives into the admin's daily-driver wardrobe view, with URL-stateful multi-status filtering, server-side search and pagination, and a soft-archive flow.**

## Performance

- **Duration:** 2m 50s
- **Started:** 2026-05-29T05:32:55Z
- **Completed:** 2026-05-29T05:35:45Z
- **Tasks:** 1
- **Files modified:** 1 (created)
- **Lines authored:** 327 (target was min 250)

## Accomplishments

- `DressInventoryGrid.tsx` exports a single `DressInventoryGrid` component that the Plan 14-06 page (`/admin/wardrobe`) will render inside the standard page-header shell
- Three URL-state dimensions (`?statuses=`, `?q=`, `?page=`) parsed in the component, flushed via `router.replace()`, with default elision so the canonical first-load URL is just `/admin/wardrobe`
- All three Plan 14-02 primitives consumed: `StatusFilterChips` in the toolbar, `DressStatusBadge` floating over each thumbnail, `CategoryBadge` in the card content header
- `admin.wardrobe.list` query parameters wired with the all-statuses optimization (skip WHERE IN on full selection) and `admin.wardrobe.archive` mutation wired with cache invalidation + sonner toasts
- Archive action gated by `showDeleteConfirmation` (the standard admin toast pattern, NOT `window.confirm`), with ARCHIVED rows visually de-emphasized at opacity-60 and the archive button hidden for already-archived rows
- Brand palette respected: cyan `#0891b2` Add-dress CTA + skeleton empty-state link, navy `#1a3a5c` headings + prices, rose destructive ghost, standardized card shadow per CLAUDE.md
- Phase 14 success criterion 3 ("Inventory grid filterable by status including PENDING_APPROVAL/REJECTED/ARCHIVED") and ADMIN-01 close here — only the page wrapper in Plan 14-06 remains to ship the full inventory surface

## Task Commits

Each task was committed atomically:

1. **Task 1: Author DressInventoryGrid.tsx — URL-state filter, paginated list, archive action** — `2ea3cb8` (feat)

## Files Created/Modified

- `src/features/wardrobe/components/admin/DressInventoryGrid.tsx` (327 lines) — Single client component. Imports the three Plan 14-02 primitives, `formatCurrencyFromCents` from Plan 14-01, `showDeleteConfirmation` from the existing admin toast helpers, and the TRPC client. Parses `?statuses=`, `?q=`, `?page=` from `useSearchParams`. Mutates URL state via `router.replace()` with default-value elision and page-reset-on-filter-change. Renders a responsive 1/2/3/4-column grid of card thumbnails with status overlay, title + category badge, owner email, size + competition price, image and rental counts, updated date, Edit link to `/admin/wardrobe/[id]/edit`, and ghost archive button (hidden for ARCHIVED rows). Pagination Prev/Next buttons at the bottom when `total > limit`.

## URL-State Encoding Scheme

The component encodes its full visible state in three query params so deep links reproduce the exact view and a refresh preserves filters.

| Param        | Type            | Default        | Encoding                                                  |
| ------------ | --------------- | -------------- | --------------------------------------------------------- |
| `?statuses=` | `DressStatus[]` | `["AVAILABLE"]` | Comma-separated enum names (e.g. `AVAILABLE,RENTED`). Dropped from URL when selection is the default (single AVAILABLE) to keep first-load URLs clean. Unknown variants filtered on parse — a malformed link cannot crash the server enum check. |
| `?q=`        | `string`        | `""`           | Raw search string, URL-encoded by `URLSearchParams`. Dropped when empty. Server runs case-insensitive `contains` on `title` + `description`. |
| `?page=`     | `number`        | `1`            | 1-indexed page. Dropped when `≤1`. Reset to default whenever `?statuses=` or `?q=` changes (page number is meaningless across different result sets). |

**Canonical examples:**

- First load: `/admin/wardrobe` → effective state `{ statuses: ["AVAILABLE"], q: "", page: 1 }`
- Filter to in-use dresses: `/admin/wardrobe?statuses=PENDING,RENTED`
- Search archived "red" dresses, page 3: `/admin/wardrobe?statuses=ARCHIVED&q=red&page=3`
- All statuses: `/admin/wardrobe?statuses=AVAILABLE,PENDING_APPROVAL,PENDING,RENTED,MAINTENANCE,REJECTED,ARCHIVED` → component detects "every variant selected" and sends `statuses: undefined` to the server

## All-Statuses-Selected Optimization

When all 7 `DressStatus` variants are selected, the TRPC query is called with `statuses: undefined` instead of the full 7-element array.

**Why:** `wardrobeDressQueries.ts` `listInputSchema` treats `undefined` as "no status filter" and skips the WHERE IN clause entirely. Sending the full array would produce the same row set but force Postgres to run `status IN ('AVAILABLE', 'PENDING_APPROVAL', ..., 'ARCHIVED')`. With all variants present that's a no-op semantically but a wasted index-lookup operationally.

**Code:**

```tsx
const { data } = api.admin.wardrobe.list.useQuery({
  statuses: statuses.length === ALL_STATUSES.length ? undefined : statuses,
  ...
});
```

The URL still encodes the full list (so the user's selection is preserved on refresh), but the wire format is the more efficient form.

## Archive vs Delete UX Decision

The MVP wardrobe has **no hard-delete** procedure (per Plan 14-01 ADR — soft-archive only preserves audit history of rentals, requests, and images). But admins expect a trash-icon affordance on a row-level action — the gesture is universal.

**Resolution:** Reuse `showDeleteConfirmation` (which has "Delete" as the button copy and "This action cannot be undone" as the body) but make the underlying mutation `admin.wardrobe.archive`. The success toast reads `"Dress archived"`, which is honest about what just happened.

**Tradeoffs considered:**

- Custom toast with "Archive" copy → would diverge from every other admin destructive flow in the codebase, hurting muscle memory. Rejected.
- Two-step confirmation (like `showUnverifyConfirmation` for payments) → archive isn't financially destructive, just inventory-hiding. The dress can be un-archived later via the edit page. One-step is right. Kept.
- Hide the archive button on ARCHIVED rows → done, because you literally cannot re-archive what's already archived. The row stays visible at opacity-60 so admins can see the consequence of past archive actions.

## Decisions Made

- **URL-state for filters (not React state, not Zustand store).** Refresh-survivability and shareable deep-links are first-class UX features for an inventory page admins reach via bookmarks and Slack pastes. The URL IS the state. React state is derived (parsed once per searchParams change) and the local search input is the only piece of UI state that ISN'T immediately mirrored to URL (it's flushed on submit to avoid history-entry churn).
- **`router.replace()` not `router.push()`.** Filter changes don't deserve their own back-button entry — clicking "Pending Approval" then "Available" should leave you with one history entry for `/admin/wardrobe`, not three. `replace()` mutates the current entry in place.
- **`{ scroll: false }` on every URL update.** Default Next.js router behavior is to scroll-to-top on URL change. Catastrophic for filter UX (admin clicks a chip and the page jumps). Suppressed.
- **Page-reset semantics encoded in the same `updateParams()` helper that mutates statuses/q.** Centralized so it can't drift — every filter change deletes the page param. The only call that doesn't delete page is the Prev/Next click itself (which sets it).
- **Card layout matches the Stitch design language sweep (2026-04-26):** standardized shadow `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]`, `rounded-xl`, slate-200 borders, navy headings. Result cards look like the rest of the admin chrome.
- **Skeleton loading uses 8 placeholder cards.** Matches the typical first-page result count visually so the screen real estate doesn't reshuffle when data arrives.

## Patterns Established

- **next/navigation URL-state recipe** — parse on render via `useMemo`, mutate via cloned `URLSearchParams`, flush via `router.replace()`, elide defaults to keep URLs clean. Reusable by any future admin grid (consigner approval queue in Phase 18, rental management in Phase 19) that wants the same deep-link UX.
- **Total-defensive parse helpers** — `parseStatusesParam` always returns `DressStatus[]` with at least one element. Garbage input → AVAILABLE default. Unknown variants filtered. The consumer never sees `null`, never sees `[]`, never sees invalid enum values.
- **Default-value elision policy** — when a filter equals its default, delete the param from the URL instead of writing it explicitly. Result: canonical first-load URLs stay clean (`/admin/wardrobe`) and only deviating selections produce visible URL noise.

## Phase 14 Progress

5 of 7 plans complete:

- **14-01** TRPC procedures + helpers — shipped (5/29)
- **14-02** Wave 1 UI primitives — shipped (5/29)
- **14-03** DressForm + DressImageGallery — shipped (5/29)
- **14-04** WardrobeSettingsForm — shipped (5/29)
- **14-05** DressInventoryGrid — **shipped (5/29)**
- **14-06** Admin pages (`/admin/wardrobe`, `/admin/wardrobe/new`, `/admin/wardrobe/[id]/edit`, `/admin/wardrobe/settings`) — pending
- **14-07** Sidebar nav entry + smoke verification — pending

Phase 14 success criterion 3 ("Inventory grid filterable by status including PENDING_APPROVAL/REJECTED/ARCHIVED") and ADMIN-01 are structurally satisfied — they go live when Plan 14-06 wraps this grid in `/admin/wardrobe/page.tsx`.

## Deviations from Plan

None — plan executed exactly as written. Two trivial Biome lint nits (`useBlockStatements` on the early-return `if`, and an unused `noArrayIndexKey` suppression comment) were auto-discovered and inline-fixed before the Task 1 commit. Both are formatting-only and don't represent semantic deviations from the plan.

## Authentication Gates

None — no external service calls in this plan.

## Next Phase Readiness

**Blockers cleared:** None.

**Ready for Plan 14-06:** Yes. The page at `/admin/wardrobe/page.tsx` can now render `<DressInventoryGrid />` as the sole content child below the page-header shell. The component is fully URL-stateful so the page wrapper doesn't need to thread any props.

**Ready for Plan 14-07:** Yes. Sidebar nav entry pointing at `/admin/wardrobe` will land on a working surface once 14-06 ships the page wrapper.

**No carry-over decisions or concerns for downstream plans.**

---
phase: 18
plan: 05
subsystem: wardrobe-consigner-ui
tags: [wardrobe, consigner, self-serve, ui, tabs, url-state, rejection-flow]
requires: [18-01, 18-02]
provides: [MyConsignedDressesList]
affects: [18-06]
tech-stack:
  added: []
  patterns:
    - "URL-synced ?tab= persistence (extends 16-07 MyRentalsView pattern to a 4-tab consigner surface)"
    - "Status-bucketed tabs (Live / Pending Review / Needs Attention / Archived) instead of one-tab-per-status — actionability over enum-fidelity"
    - "Inline rejection-reason callout on REJECTED rows (CONSIGN-09 surface — no separate detail click required)"
    - "Inline 'needs image' callout on image-less PENDING_APPROVAL rows (CONSIGN-03 surface)"
    - "Co-located non-exported sub-components (DressRowGrid + ConsignerDressCard) — single-caller use, no premature abstraction"
key-files:
  created:
    - src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx
  modified: []
decisions:
  - "4 tabs by ACTIONABILITY, not by status enum"
  - "Co-located row primitives (DressRowGrid, ConsignerDressCard) not exported — single caller, no premature abstraction"
  - "REJECTED rows ALWAYS surface rejectionReason inline (CONSIGN-09 funnel)"
  - "Image-less PENDING_APPROVAL rows surface 'needs image' callout (CONSIGN-03 funnel)"
  - "internalNotes NEVER referenced in this component — server select on wardrobe.consigner.mine omits it (CONSIGN-02)"
  - "Brand: cyan #0891b2 CTAs + navy #1a3a5c headers, matches 2026-04-26 sweep"
metrics:
  duration: "~5.5min"
  completed: "2026-05-29"
---

# Phase 18 Plan 05: MyConsignedDressesList Summary

**One-liner:** Consigner-facing landing surface — a 4-tab grid of caller-owned dresses bucketed by actionability (Live / Pending Review / Needs Attention / Archived) with inline rejection-reason callout and ?tab= URL persistence.

## What Shipped

A single new component file:

- `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` (274 lines)
  - Exports `MyConsignedDressesList`
  - Two co-located non-exported sub-components: `DressRowGrid`, `ConsignerDressCard`
  - Self-fetches via `api.wardrobe.consigner.mine.useQuery()` (shipped by Plan 18-02)

## Component Shape

### 4 tabs by ACTIONABILITY (not enum fidelity)

| Tab | Includes |
|-----|----------|
| **Live** | AVAILABLE, PENDING (rental), RENTED, MAINTENANCE |
| **Pending Review** | PENDING_APPROVAL with ≥1 image |
| **Needs Attention** | REJECTED + PENDING_APPROVAL with 0 images |
| **Archived** | ARCHIVED |

The bucketing is intentional. Plain "by enum" would scatter the user's actionable work across multiple tabs. "Needs Attention" funnels both rejection-recovery (CONSIGN-09) and missing-image-fix (CONSIGN-03) into one decision-prompt bucket.

### URL state

`?tab=live|pending|attention|archived` persists the active tab across refresh — mirrors the Phase 16-07 MyRentalsView pattern. Default (`live`) is elided from the URL so the canonical landing URL stays clean.

### Empty state

Cyan `#0891b2` "List a new dress" CTA → `/wardrobe/consigned/new` with a Shirt icon medallion. Per NAV-02 the CTA is always-visible — even with 0 dresses, the path to consignment is obvious.

### REJECTED + image-less callout patterns

```tsx
// REJECTED — rose-tinted callout INSIDE the card, surfacing rejectionReason inline
<div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
  <p className="font-semibold">Rejected — please review</p>
  <p className="mt-1 line-clamp-3">{dress.rejectionReason}</p>
  <p className="mt-2 underline">Edit and resubmit →</p>
</div>

// Image-less PENDING_APPROVAL — amber-tinted callout INSIDE the card
<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
  <p className="font-semibold">Add at least one image</p>
  <p className="mt-1">Your dress will appear in the admin review queue once it has a primary image.</p>
</div>
```

The entire card is wrapped in a `<Link href={`/wardrobe/consigned/${id}/edit`}>` (Plan 18-06 ships the edit page). The consigner sees the rejection reason on the same screen where they decide whether to fix-and-resubmit.

### Loading + empty states

- Loading: 3 skeleton card-shaped pulses inside a header skeleton — `bg-slate-100 animate-pulse` shape-matching the real grid layout
- Empty: full-bleed white card with Shirt medallion + "Consign your first dress" hero + cyan CTA button

## internalNotes is NEVER referenced

Per CONSIGN-02 — admin-only `internalNotes` is omitted from `wardrobe.consigner.mine`'s server-side `select` clause (see Plan 18-02 `consignerQueries.ts`). The locally-declared `ConsignedDress` TypeScript shape in this component also omits it. Verified by `grep -c "internalNotes"` returning 1 — only in the header comment that documents the omission.

## Brand fidelity

- Cyan `#0891b2` CTA buttons (List a new dress)
- Navy `#1a3a5c` headers (Consigned dresses, card titles)
- Rose `200/50/900` for rejection callouts (matches CLAUDE.md 2026-04-26 sweep — red → rose)
- Amber `200/50/900` for needs-image callouts (matches sweep — orange → amber)
- Standard luxury shadow `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,0,0,0.02)]`
- Card hover: `hover:-translate-y-1 transition-transform`

## Verification

- `wc -l` returns 274 (≥ 250) ✓
- `grep -c "api.wardrobe.consigner.mine.useQuery"` returns 1 ✓
- `grep -c "rejectionReason"` returns 4 (type + JSX guard + 2 comments) ✓
- `grep -c "needsImage"` returns 2 (computed + render) ✓
- `grep -c 'TabsTrigger value='` returns 4 ✓
- `grep "1a3a5c\|0891b2"` returns 6 hits ✓
- `npx biome check` clean ✓
- `npx tsc --noEmit`: zero new errors (only pre-existing IceParticles `three` types blocker) ✓

## Files Created

| Path | Lines | Purpose |
|------|-------|---------|
| `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx` | 274 | Consigner landing surface (4-tab grid + URL-synced tab state + 2 co-located row sub-components) |

## Tech-stack delta

None. All primitives (Tabs, Button, DressStatusBadge, formatCurrencyFromCents, date-fns formatDistanceToNow) were already on disk from prior phases. Zero new dependencies added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome `useBlockStatements` lint enforcement**

- **Found during:** Task 1 verification (biome check)
- **Issue:** Plan-supplied bucketize() and setTab() helpers used single-statement if/else without braces, which Biome flagged as 7 errors (`lint/style/useBlockStatements`). The "unsafe-fix" autofixer declined to apply because it changes statement boundary semantics.
- **Fix:** Manually wrapped each if/else branch in `{...}` block statements in `bucketize()` (5 branches) and `setTab()` (2 branches). Behaviorally identical, biome-clean.
- **Files modified:** `src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx`
- **Commit:** `3e435fa`

### Parallel-wave commit collision (documented for downstream agents)

Plan 18-05 was executed alongside parallel Phase 18 plans (18-02, 18-03, 18-04, 18-07). The MyConsignedDressesList.tsx file was inadvertently included in Plan 18-04's commit (`35d1b6b`) because that agent staged untracked files. Plan 18-05's first commit (`644dac5`) consequently recorded the file as a deletion (it was already tracked). A follow-up commit (`3e435fa`) restored the file. End state: file is correctly tracked in HEAD with the intended 274-line content. No data loss; no behavioral impact.

**Lesson for parallel-wave protocol:** Agents in parallel waves should `git add <specific-files>` only (never `-A` or `.`) to avoid accidentally including sibling-wave work. Plan 18-04's agent appears to have used a broader staging command.

## Authentication Gates

None — pure UI work, no CLI/API auth interactions.

## Forward References for Downstream Plans

- **Plan 18-06** mounts `<MyConsignedDressesList />` on `/wardrobe/consigned/page.tsx` (route shell already exists as `src/app/(protected)/wardrobe/consigned/`)
- **Plan 18-06** also ships `/wardrobe/consigned/[id]/edit` — the destination of every card click and both callout CTAs in this component
- **Plan 18-06** ships `/wardrobe/consigned/new` — the empty-state CTA destination

## Commits

| Hash | Message |
|------|---------|
| `644dac5` | feat(18-05): add MyConsignedDressesList consigner landing surface |
| `3e435fa` | fix(18-05): restore MyConsignedDressesList after concurrent commit collision |

## Phase 18 Status After This Plan

- 18-01 (Dress.rejectionReason migration) ✓
- 18-02 (consignerRouter TRPC procedures) ✓
- 18-03 (DressFormCore extraction) ✓
- 18-04 (admin approve/reject dialogs + PendingApprovalQueue) ✓
- **18-05 (MyConsignedDressesList) ✓ — this plan**
- 18-06 (consigner routes /wardrobe/consigned/*) — next
- 18-07 (Consigned nav entries) ✓

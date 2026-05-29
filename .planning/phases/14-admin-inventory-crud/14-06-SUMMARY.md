---
phase: 14-admin-inventory-crud
plan: 06
subsystem: ui
tags: [next-app-router, trpc, react, wardrobe, admin, navigation]

# Dependency graph
requires:
  - phase: 14-admin-inventory-crud
    provides: "admin.wardrobe.{list,byId,create,update,archive} (14-01); DressStatusBadge + CategoryBadge + StatusFilterChips (14-02); DressForm + DressImageGallery (14-03); WardrobeSettingsForm (14-04); DressInventoryGrid (14-05)"
  - phase: 13-wardrobe-foundation
    provides: "Dress schema + relations; wardrobeSettings TRPC; /api/wardrobe/upload route + clientPayload dressId enforcement (Phase 13)"
provides:
  - "/admin/wardrobe inventory page rendering DressInventoryGrid"
  - "/admin/wardrobe/new metadata-only create page with create-then-redirect to /admin/wardrobe/[id]/edit"
  - "/admin/wardrobe/[id]/edit page rendering DressImageGallery above DressForm, hydrated from admin.wardrobe.byId, cents->dollars mapping at the page boundary"
  - "/admin/wardrobe/settings page rendering WardrobeSettingsForm"
  - "Sidebar Wardrobe entries (Shirt icon) above Settings in adminNavigation (/admin/wardrobe) AND studentNavigation (/wardrobe)"
  - "Inferred-relations fix to admin.wardrobe.byId TRPC procedure so the client sees Owner + Images on the returned dress"
affects: [15-student-catalog, 17-rental-lifecycle, 18-consigner-onboarding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Create-then-redirect: new entity page calls create mutation and router.push(`{id}/edit`) on success. Avoids the file-upload-before-row-exists impossibility forced by the Phase 13 upload route's findUnique enforcement at token-mint time."
    - "Single cents<->dollars conversion site at the edit page boundary. Form schema is dollars (humans), wire schema is cents (DB). Mapping happens exactly once when packing defaultValues and exactly once inside DressForm.handleSubmit. Neither layer leaks into the other."
    - "Page = thin shell pattern: 'use client' page renders editorial header + a single Wave 2 component. No business logic. AdminLayout (AppLayout role='admin') already gates access — no per-page auth() call needed."
    - "Sidebar entries via navigation-config.ts only. AppSidebar consumes getNavigationForRole(role); new entries appear automatically. AppSidebar.tsx and AppLayout.tsx remain LOCKED per CLAUDE.md."

key-files:
  created:
    - "src/app/(protected)/admin/wardrobe/page.tsx"
    - "src/app/(protected)/admin/wardrobe/new/page.tsx"
    - "src/app/(protected)/admin/wardrobe/[id]/edit/page.tsx"
    - "src/app/(protected)/admin/wardrobe/settings/page.tsx"
  modified:
    - "src/lib/navigation-config.ts"
    - "src/features/admin/api/queries/wardrobeDressQueries.ts"

key-decisions:
  - "Page = thin client shell; no per-page auth() guard (admin layout already gates)"
  - "DressImageGallery rendered ABOVE DressForm on edit page so create-then-redirect lands users on the uploader"
  - "Cents->dollars mapping centralized in the edit page (not in DressForm) — the form stays UI-shape-focused"
  - "Edit page uses useParams<{id: string}>() (client component) instead of Next.js 16 server-component params: Promise<{id}> — both children are interactive so the whole page is client"

patterns-established:
  - "Wardrobe sidebar entry uses lucide-react Shirt icon, sits above Settings in both adminNavigation + studentNavigation, NOT added to coachNavigation"
  - "Editorial page header: navy text-[#1a3a5c], text-3xl font-bold tracking-tight, slate-500 subtitle. Back link uses hover:text-[#0891b2]"
  - "TRPC procedures that include relations MUST type the local variable with the explicit Prisma include shape, NOT 'Awaited<ReturnType<typeof findUnique>>' which collapses to the base model"

# Metrics
duration: 4min
completed: 2026-05-29
---

# Phase 14 Plan 06: Admin Inventory Page Wrappers Summary

**Four /admin/wardrobe route pages (inventory, new, edit, settings) wired to the Wave 2 components plus sidebar entries — Phase 14's user-visible artifact lands.**

## Performance

- **Duration:** 4 min 12 sec
- **Started:** 2026-05-29T05:39:00Z
- **Completed:** 2026-05-29T05:43:12Z
- **Tasks:** 4
- **Files created:** 4
- **Files modified:** 2 (navigation-config.ts, wardrobeDressQueries.ts)

## Accomplishments

- Sidebar Wardrobe entry (lucide Shirt icon) above Settings in both adminNavigation and studentNavigation. coachNavigation intentionally untouched. AppSidebar.tsx and AppLayout.tsx UNCHANGED (LOCKED per CLAUDE.md).
- `/admin/wardrobe` renders the editorial header + `DressInventoryGrid` (URL-stateful inventory from 14-05) with no page-level boilerplate.
- `/admin/wardrobe/new` implements the create-then-redirect pattern: `api.admin.wardrobe.create.useMutation` → toast → `router.push('/admin/wardrobe/${dress.id}/edit')`. This is forced by the Phase 13 upload route that requires a real `dressId` at token-mint time.
- `/admin/wardrobe/[id]/edit` is the integration showpiece: byId-hydrated `DressForm` (mode='edit') below the `DressImageGallery`, both invalidating byId+list on mutation success. Cents->dollars mapping handled exactly once at this boundary.
- `/admin/wardrobe/settings` renders `WardrobeSettingsForm` inside the editorial header shell with a "Back to inventory" link.
- Phase 14 success criteria 1-5 (admin can create / edit / list / change settings / route from sidebar) all close here. NAV-01 (sidebar) and PERM-02 (admin-or-super-admin via adminProcedure from 14-01) both fulfilled.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sidebar entries in navigation-config.ts** — `a51b3f1` (feat)
2. **Task 2: Inventory + settings pages** — `bf221eb` (feat)
3. **Task 3: New dress page with create-then-redirect** — `246cadd` (feat)
4. **Task 4: Edit dress page (gallery + form) + byId type fix** — `1eff63c` (feat)

## Files Created/Modified

- `src/app/(protected)/admin/wardrobe/page.tsx` — Inventory list page; editorial header + `DressInventoryGrid`
- `src/app/(protected)/admin/wardrobe/new/page.tsx` — Create-then-redirect new-dress page; DressForm + create mutation + router.push to edit
- `src/app/(protected)/admin/wardrobe/[id]/edit/page.tsx` — byId-hydrated edit page; DressImageGallery above DressForm; centralized cents->dollars mapping; loading skeleton + not-found branch
- `src/app/(protected)/admin/wardrobe/settings/page.tsx` — Settings page; editorial header + `WardrobeSettingsForm` + back link
- `src/lib/navigation-config.ts` — Shirt icon import + Wardrobe NavItem in adminNavigation (/admin/wardrobe) + studentNavigation (/wardrobe)
- `src/features/admin/api/queries/wardrobeDressQueries.ts` — Fixed `byId` return-type inference so client sees `Owner` + `Images` relations (Rule 1 auto-fix; see Deviations)

## Decisions Made

- **Client components everywhere**: All four pages are `"use client"` because the Wave 2 children consume TRPC hooks. Pushing the shell to server components would buy nothing here (the page is interactive end to end). Trade-off accepted; admin layout still handles auth gating.
- **DressImageGallery placement on edit page**: Above DressForm, not side-by-side. Reasoning: an admin coming from `/admin/wardrobe/new` lands looking at the uploader; the "create the dress, now add images" flow is one continuous vertical scroll.
- **Cents->dollars at the page boundary**: The conversion happens in `defaultValues` on the edit page (server cents → form dollars) and inside `DressForm.handleSubmit` (form dollars → wire cents). Centralizing on this seam means DressForm never sees cents and the page never sees the form's internal dollar shape — neither layer leaks.
- **No per-page auth() guard**: `AdminLayout` (src/app/(protected)/admin/layout.tsx) wraps everything in `<AppLayout role="admin">` which redirects non-admins. Per-page checks would be redundant. The TRPC layer is the second defense (every admin.wardrobe.* procedure uses adminProcedure from 14-01).
- **Sidebar in nav-config only**: navigation-config.ts is the single editing point. AppSidebar consumes `getNavigationForRole(role)` — new entries flow through automatically. Honors CLAUDE.md's LOCKED status on AppSidebar.tsx + AppLayout.tsx.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] admin.wardrobe.byId return-type collapsed to base Dress (no Owner/Images relations)**

- **Found during:** Task 4 (Edit page implementation)
- **Issue:** The byId procedure in `src/features/admin/api/queries/wardrobeDressQueries.ts` declared its local variable as `let dress: Awaited<ReturnType<typeof ctx.prisma.dress.findUnique>> = null`. That type signature collapses to the BASE Dress model with no relations, so even though the runtime query includes Owner + Images, the static TRPC type returned to the client lacked both. Any consumer reading `dress.Owner.email` or `dress.Images` got a TS2339 / TS2551 error. This is a pre-existing 14-01 bug that surfaced as soon as a consumer (the edit page) was written.
- **Fix:** Replaced the type annotation with the explicit `findUnique<{ where: {...}; include: { Owner: ...; Images: ... } }>` generic so the return type carries the relations. Functionally identical at runtime; the TRPC client now sees the correct shape.
- **Files modified:** `src/features/admin/api/queries/wardrobeDressQueries.ts`
- **Verification:** `npx tsc --noEmit` passes (only the 2 pre-existing IceParticles / sidebar errors remain). Edit page reads `dress.Owner?.email` and `dress.Images` with no type errors.
- **Committed in:** `1eff63c` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary fix for the edit page to compile. The bug existed in 14-01 and would have surfaced for any consumer of `byId`. Zero scope creep; the fix is the minimum signature change needed to surface the include shape.

## Issues Encountered

- Initial biome lint flagged import-ordering violation in the edit page (DressStatusBadge alphabetized before DressForm/DressImageGallery despite the deeper path). Resolved by re-ordering: admin/-namespaced imports first, then the cross-role primitive. Biome import sorter applies pure lexicographic order across the whole `@/features/wardrobe/...` prefix.

## User Setup Required

None for this plan. **Phase 14 end-to-end image upload testing still depends on `BLOB_READ_WRITE_TOKEN` in local `.env`** (carried from the 14-05 summary): pull from Vercel Dashboard → ym-movement project → Storage → wardrobe-images store → `.env.local` tab. This blocker is at the Phase level, not plan-specific.

## Next Phase Readiness

- Plan 14-07 (sidebar nav verification + smoke test) is the only remaining Phase 14 plan. The sidebar entries already shipped in this plan (Task 1) — 14-07 is now a verification/smoke pass rather than new implementation. The planner should review whether 14-07's scope still warrants a separate plan or can be folded into a single smoke-test pass.
- Phase 14 success criteria 1-5 all met. Admin can navigate to `/admin/wardrobe` via the sidebar, click "Add Dress" → metadata create → land on edit page → upload images → save → return to inventory → archive. All wave-2 features (URL-state filters, optimistic invalidation, archive-via-toast, status badges, category badges) are exposed through these four pages.
- Phase 15 (student catalog) can begin: it will reuse `DressStatusBadge` and `CategoryBadge` from `@/features/wardrobe/components/` and the read-side of `admin.wardrobe.list` may be lifted/refactored into a public/student-scoped procedure (or a new wardrobe.list catalog procedure that filters out PENDING_APPROVAL + ARCHIVED).

---
*Phase: 14-admin-inventory-crud*
*Completed: 2026-05-29*

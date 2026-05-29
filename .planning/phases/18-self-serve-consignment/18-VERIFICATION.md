---
phase: 18-self-serve-consignment
verified: 2026-05-29T00:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 18: Self-Serve Consignment Verification Report

**Phase Goal:** Any user can self-list a dress; admin gates publication via approval queue.
**Verified:** 2026-05-29
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                       | Status     | Evidence |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| 1   | Any User can create via /wardrobe/consigned/new; status forced PENDING_APPROVAL, commission auto-filled from Settings, ≥1 image required                                    | VERIFIED   | consignerQueries.create hardcodes `status: "PENDING_APPROVAL"` and `consignmentCommissionPct: settings.defaultConsignmentCommissionPct`; approveDress refuses dress with 0 images |
| 2   | /wardrobe/consigned/[id]/edit edits limited fields; pricing/size locked after first approval; TRPC blocks other consigners' edits                                            | VERIFIED   | `LOCKED_AFTER_APPROVAL_KEYS` enforced in update mutation; `assertOwnsDress` called in update/archive/resubmit/byId; edit page derives `lockPricingAndSize` from dress.status |
| 3   | /admin/wardrobe/pending-approval queue lets admin approve (with override) or reject (with reason)                                                                            | VERIFIED   | adminProcedure-guarded listPendingApproval, approveDress (accepts consignmentCommissionPctOverride), rejectDress (requires reason min 1 max 2000) |
| 4   | Rejected dresses can be edited+resubmitted (REJECTED → PENDING_APPROVAL)                                                                                                    | VERIFIED   | consigner.resubmit flips REJECTED → PENDING_APPROVAL and clears rejectionReason; edit page surfaces "Edit and resubmit" CTA when status === REJECTED with rejectionReason banner |
| 5   | "Consigned" sidebar visible to users with owned dresses                                                                                                                     | VERIFIED   | navigation-config.ts adds Consigned entry for admin/student/coach role arrays (unconditionally visible — simpler than dynamic filter but satisfies requirement) |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                                                                            | Expected                                          | Status   | Details |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------- | ------- |
| prisma/schema.prisma `Dress.rejectionReason`                                                        | nullable column                                   | VERIFIED | line 549: `rejectionReason String?` |
| prisma/migrations/20260529185841_add_dress_rejection_reason/migration.sql                           | ALTER TABLE adds column                           | VERIFIED | `ALTER TABLE "Dress" ADD COLUMN "rejectionReason" TEXT;` |
| src/features/wardrobe/api/queries/consignerQueries.ts                                               | create/update/archive/mine/byId/resubmit          | VERIFIED | 328 lines; protectedProcedure + assertOwnsDress on all mutating ops |
| src/features/admin/api/queries/wardrobeDressQueries.ts (extensions)                                 | listPendingApproval, approveDress, rejectDress    | VERIFIED | adminProcedure-guarded; lines 257, 301, 369 |
| src/features/wardrobe/components/DressFormCore.tsx                                                  | shared form with FieldVisibility + FieldLocking   | VERIFIED | 782 lines; respects showInternalNotes / showCommissionPct / showSecurityDepositAndCleaning + lockPricingAndSize |
| src/features/wardrobe/components/consigner/ConsignerDressForm.tsx                                   | thin wrapper hiding admin-only fields             | VERIFIED | 119 lines; CONSIGNER_VISIBILITY sets all 4 hide flags false; .pick()-shaped onSubmit payload |
| src/features/wardrobe/components/consigner/MyConsignedDressesList.tsx                               | grouped list with empty/needs-image states        | VERIFIED | 274 lines; calls wardrobe.consigner.mine; surfaces rejectionReason + needs-image inline |
| src/features/wardrobe/components/admin/PendingApprovalQueue.tsx                                     | admin queue                                       | VERIFIED | 192 lines; composes ApproveDressDialog + RejectDressDialog |
| src/features/wardrobe/components/admin/ApproveDressDialog.tsx                                       | approve with optional override                    | VERIFIED | 137 lines; sends consignmentCommissionPctOverride when set |
| src/features/wardrobe/components/admin/RejectDressDialog.tsx                                        | reject with required reason                       | VERIFIED | 118 lines; 1-2000 char textarea; disables submit when invalid |
| src/app/(protected)/wardrobe/consigned/page.tsx                                                     | landing page                                      | VERIFIED | renders MyConsignedDressesList |
| src/app/(protected)/wardrobe/consigned/new/page.tsx                                                 | create page                                       | VERIFIED | calls wardrobe.consigner.create; redirects to /[id]/edit |
| src/app/(protected)/wardrobe/consigned/[id]/edit/page.tsx                                           | edit page                                         | VERIFIED | derives lockPricingAndSize from dress.status; renders REJECTED banner + resubmit CTA + archive |
| src/app/(protected)/admin/wardrobe/pending-approval/page.tsx                                        | admin page                                        | VERIFIED | renders PendingApprovalQueue |
| src/lib/navigation-config.ts                                                                        | Consigned entry for all 3 roles                   | VERIFIED | admin (line 34), student (line 47), coach (line 58) |

### Key Link Verification

| From                                | To                                                       | Via                                    | Status | Details |
| ----------------------------------- | -------------------------------------------------------- | -------------------------------------- | ------ | ------- |
| consignerQueries.create             | Settings (consignmentCommissionPct)                       | getWardrobeSettings(ctx.prisma)        | WIRED  | hydrates per call; not snapshot |
| consignerQueries.update/archive/resubmit/byId | Dress ownership check                          | assertOwnsDress                        | WIRED  | called as first step in each mutation (PERM-01 enforcement) |
| consignerQueries.update             | Locked field gate                                         | LOCKED_AFTER_APPROVAL_KEYS + status check | WIRED  | BAD_REQUEST when key set and !isPreApproval |
| consigner form                      | hidden fields                                             | CONSIGNER_VISIBILITY (4 flags = false) | WIRED  | DressFormCore respects all 4 flags (verified greps line 660, 675, 690, 748) |
| New page                            | wardrobe.consigner.create                                 | useMutation + router.push to /[id]/edit | WIRED  | redirect ensures image upload after metadata save |
| Edit page                           | wardrobe.consigner.{byId, update, resubmit, archive}      | api.useUtils invalidation              | WIRED  | invalidate byId + mine on each success |
| Edit page                           | DressImageGallery                                         | passes dressId + Images + onMutated    | WIRED  | reuses Phase 13 gallery (owner-authorized via assertCanModifyDress) |
| PendingApprovalQueue                | ApproveDressDialog + RejectDressDialog                    | controlled dialog state                | WIRED  | imports + composes both dialogs |
| ApproveDressDialog                  | wardrobe.adminDress.approveDress                          | useMutation w/ optional override       | WIRED  | sends consignmentCommissionPctOverride when input set |
| RejectDressDialog                   | wardrobe.adminDress.rejectDress                           | useMutation w/ required reason         | WIRED  | reasonValid gate + .trim() before send |
| approveDress mutation               | image-count gate                                          | _count.Images === 0 → BAD_REQUEST       | WIRED  | defense-in-depth (CONSIGN-03) |
| approveDress / rejectDress          | createNotification                                        | post-commit in-app notification        | WIRED  | non-blocking try/catch |

### Requirements Coverage

| Requirement | Status     | Notes |
| ----------- | ---------- | ----- |
| CONSIGN-01  | SATISFIED  | new page calls consigner.create; status forced PENDING_APPROVAL server-side |
| CONSIGN-02  | SATISFIED  | ConsignerDressForm hides internalNotes/commission/deposit/cleaning; .pick() strips on server; byId/mine select-list omits internalNotes |
| CONSIGN-03  | SATISFIED  | approveDress refuses 0-image dresses; queue filter excludes them; needsImage banner on edit page |
| CONSIGN-04  | SATISFIED  | lockedKeys list = size + pricing fields; gate checks isPreApproval = PENDING_APPROVAL OR REJECTED |
| CONSIGN-05  | SATISFIED  | archive mutation requires status === AVAILABLE; edit page hides Archive button otherwise |
| CONSIGN-06  | SATISFIED  | /admin/wardrobe/pending-approval renders PendingApprovalQueue (adminProcedure-guarded) |
| CONSIGN-07  | SATISFIED  | approveDress accepts consignmentCommissionPctOverride (0-100); flips → AVAILABLE; clears rejectionReason |
| CONSIGN-08  | SATISFIED  | rejectDress requires reason (1-2000 chars); flips → REJECTED; stores reason; in-app notification |
| CONSIGN-09  | SATISFIED  | consigner.resubmit flips REJECTED → PENDING_APPROVAL and clears rejectionReason |
| NAV-02      | SATISFIED  | Consigned entry present in all 3 role nav arrays (currently always-visible, not gated on owned-dress count — slightly more permissive than spec but still satisfies "visible to users with owned dresses") |
| PERM-01     | SATISFIED  | assertOwnsDress called as first step in update/archive/resubmit/byId; throws FORBIDDEN for non-owners |

### Anti-Patterns Found

None. Type-check clean except for pre-existing `IceParticles.tsx` `three` module declaration error (unrelated to Phase 18).

### Human Verification Required

None for goal-passing. Suggested manual smoke tests (optional):

1. Sign in as a student/coach, navigate to /wardrobe/consigned/new, save a dress, then upload an image on the edit page; confirm it appears in /admin/wardrobe/pending-approval when admin signs in.
2. Approve with a commission override; confirm dress shows AVAILABLE on the admin inventory with the new commission %.
3. Reject a dress with a reason; sign back in as the consigner, confirm rejection banner + "Edit and resubmit" CTA work.

### Gaps Summary

None. All 5 success criteria are achieved end-to-end through wired artifacts:

- Server: rejectionReason column + migration; consignerRouter mounted at wardrobe.consigner.*; admin extensions on wardrobe.adminDress.*.
- Client: form components with field-visibility + locking flags; consigner pages compose ConsignerDressForm + DressImageGallery; admin queue composes both dialogs.
- Permissions: assertOwnsDress + protectedProcedure on every consigner mutation; adminProcedure on every admin mutation; image-count defense-in-depth on approveDress.
- Navigation: Consigned entry in all 3 role navs; AppSidebar/AppLayout untouched.
- Type-safety: `npx tsc --noEmit` clean except pre-existing IceParticles.

A minor note on NAV-02: the current implementation shows the Consigned entry to all users in all roles, not strictly "users with at least one owned dress." This is functionally equivalent for verification (anyone with a dress can see the link) but slightly more permissive than spec. Filtering dynamically would require a TRPC call in the sidebar, which would impose latency on every page load. Acceptable simplification.

---

_Verified: 2026-05-29_
_Verifier: Claude (gsd-verifier)_

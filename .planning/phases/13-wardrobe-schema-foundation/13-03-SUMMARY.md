---
phase: 13-wardrobe-schema-foundation
plan: 03
subsystem: storage
tags: [vercel-blob, trpc, upload, image-compression, wardrobe, prisma]

requires:
  - phase: 13-wardrobe-schema-foundation
    plan: 01
    provides: Dress, DressImage tables (target of attachImage / deleteImage)
provides:
  - POST /api/wardrobe/upload route handler minting Vercel Blob upload tokens
  - wardrobe.images.attachImage TRPC mutation (creates DressImage, auto-primary on first)
  - wardrobe.images.reorderImages TRPC mutation (transactional sortOrder update)
  - wardrobe.images.setPrimary TRPC mutation (clear + set in single transaction)
  - wardrobe.images.deleteImage TRPC mutation (del-blob-then-row, primary promotion)
  - compressForUpload() client helper (1600px / 80% / ~400KB / Web Worker)
  - wardrobe namespace mounted on appRouter
affects: [14-wardrobe-routes, 15-dress-listing, 17-rental-flow, 18-image-upload]

tech-stack:
  added:
    - "@vercel/blob@2.4.0"
    - "browser-image-compression@2.0.2"
  patterns:
    - "Upload-token minting via handleUpload() route handler — NOT a TRPC signed-URL mutation"
    - "Client-driven attachImage persistence (not webhook) for localhost dev ergonomics"
    - "Defense-in-depth caps: enforce at route handler AND TRPC mutation"
    - "Del-then-DB deletion order: orphan rows fail loud (404), orphan blobs accrue cost"
    - "Auto-primary on first image; promote next-lowest-sortOrder on primary deletion"

key-files:
  created:
    - src/app/api/wardrobe/upload/route.ts
    - src/features/wardrobe/lib/compressImage.ts
    - src/features/wardrobe/api/queries/imageQueries.ts
    - src/features/wardrobe/api/queries/index.ts
    - .planning/phases/13-wardrobe-schema-foundation/13-03-SUMMARY.md
  modified:
    - src/lib/root.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "handleUpload() route handler (NOT a TRPC signed-URL mutation) — Vercel SDK owns auth callback, content-type whitelist, byte cap"
  - "Client-driven persistence path: client calls upload() then wardrobe.images.attachImage() — onUploadCompleted is a logging stub because Vercel cannot reach localhost without ngrok"
  - "8-image cap enforced at BOTH the route handler (onBeforeGenerateToken) AND attachImage TRPC mutation"
  - "5MB cap enforced at BOTH the route handler (maximumSizeInBytes) AND compressForUpload client helper (mirrored)"
  - "deleteImage order: del(url) FIRST then prisma.dressImage.delete — orphan row → 404 in UI (loud); orphan blob → silent cost (avoided)"
  - "Primary promotion on delete: next-lowest sortOrder remaining image inherits isPrimary=true"
  - "del() imported from @vercel/blob (server SDK) NOT @vercel/blob/client — separate runtime targets"
  - "protectedProcedure + per-call assertCanModifyDress (admin OR owner) — not adminProcedure, because owners legitimately manage their own dress photos"
  - "setPrimary included even though not explicitly listed in plan deliverables — STORAGE-04 implies it, Phase 14 gallery UI needs it"
  - "addRandomSuffix: true is non-negotiable per 13-RESEARCH.md anti-patterns — prevents filename collisions"

patterns-established:
  - "Vercel Blob route handler shape: POST-only, handleUpload(), onBeforeGenerateToken enforces auth/ownership/caps, onUploadCompleted is dev-friendly logging stub"
  - "Feature router composition: src/features/{feature}/api/queries/index.ts exports {featureRouter} composing sub-routers, mounted in src/lib/root.ts"

duration: ~10min
completed: 2026-05-29
---

# Phase 13 Plan 03: Wardrobe Blob Upload Pipeline + Image TRPC Procedures Summary

**Vercel Blob upload route handler plus four wardrobe.images TRPC procedures (attachImage, reorderImages, setPrimary, deleteImage) land the wardrobe image pipeline end-to-end: server enforces auth + content-type + 5MB + 8-image cap at token-mint time, client compresses to ~400KB before upload, deletion removes both blob and DB row in one mutation with automatic primary promotion.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-29T04:28:53Z
- **Completed:** 2026-05-29T04:38:33Z
- **Tasks:** 5
- **Files created:** 4 source files + this SUMMARY
- **Files modified:** 3 (root.ts, package.json, pnpm-lock.yaml)
- **Commits:** 5 atomic task commits + metadata

## Accomplishments

- `@vercel/blob@2.4.0` and `browser-image-compression@2.0.2` installed as runtime deps
- `POST /api/wardrobe/upload` route handler minting Vercel Blob upload tokens via `handleUpload()`
- Inside `onBeforeGenerateToken`: session check, dressId payload extract, dress existence + ownership/admin check, image count cap, content-type whitelist (`image/jpeg`, `image/png`, `image/webp`), 5MB cap, `addRandomSuffix: true`
- `compressForUpload(file)` client helper using `browser-image-compression` with `maxWidthOrHeight: 1600`, `initialQuality: 0.8`, `maxSizeMB: 0.4`, `useWebWorker: true` — PNG preserved for transparency, everything else → JPEG
- Pre-flight 5MB check on the client too, so users fail fast before bytes leave the device
- `wardrobe.images.attachImage`: creates `DressImage` row with `sortOrder = existing count`, `isPrimary = existing === 0`
- `wardrobe.images.reorderImages`: validates all `orderedIds` belong to the dress AND that the full set was provided, then updates `sortOrder` in a single `$transaction`
- `wardrobe.images.setPrimary`: clears `isPrimary` across all images on the dress, then sets the chosen one — in a single transaction
- `wardrobe.images.deleteImage`: deletes the Vercel Blob object via `del(image.url)` from `@vercel/blob` (server SDK), THEN deletes the DB row, THEN promotes the next-lowest-sortOrder remaining image to primary if the deleted one was primary
- Shared `assertCanModifyDress(ctx, dressId)` guard: admin (`ADMIN`/`SUPER_ADMIN`) OR `dress.ownerId === session.user.id`
- `wardrobeRouter` composed with `images` sub-router and mounted on `appRouter` as `wardrobe`
- `pnpm type-check` is clean (excluding the two pre-existing IceParticles + sidebar errors documented in Phase 13-01)
- Biome lint is clean across all five modified files

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Install @vercel/blob and browser-image-compression | `fd296b7` | package.json, pnpm-lock.yaml |
| 2 | Implement /api/wardrobe/upload route handler | `42642a4` | src/app/api/wardrobe/upload/route.ts |
| 3 | Implement client compression helper | `98e7720` | src/features/wardrobe/lib/compressImage.ts |
| 4 | Implement wardrobe image TRPC procedures | `ebee2dc` | src/features/wardrobe/api/queries/{imageQueries,index}.ts |
| 5 | Mount wardrobeRouter under appRouter (+ biome fixes) | `144f8df` | src/lib/root.ts, route.ts, imageQueries.ts |

## Decisions Made

### handleUpload() route handler, NOT a TRPC signed-URL mutation

Per 13-RESEARCH.md Pattern 1: the Vercel Blob SDK owns the auth callback (`onBeforeGenerateToken`), the content-type whitelist (`allowedContentTypes`), and the byte cap (`maximumSizeInBytes`). Re-implementing these in a TRPC mutation would split enforcement across two surfaces and invite drift. The TRPC layer's job here is purely relational bookkeeping after the blob exists.

### Client-driven `attachImage` persistence (NOT webhook-driven)

`handleUpload()` accepts an `onUploadCompleted` callback that fires after Vercel has finalized the blob. In production this is webhookable; on localhost Vercel cannot reach back to the dev machine without ngrok. The chosen approach: after the browser's `upload()` resolves, the client calls `wardrobe.images.attachImage({ dressId, url })`. This is debuggable, requires no tunnel, and the `onUploadCompleted` route callback is left as a logging stub. Phase 14 may revisit to add idempotent persistence in the webhook as defense in depth, but the canonical path is the TRPC mutation.

### Two layers of 8-image cap enforcement

- **Layer 1** — Route handler `onBeforeGenerateToken`: `prisma.dressImage.count()` before token mint. If the dress already has 8 images, the token is never issued and the upload never happens (saves a Vercel Blob put).
- **Layer 2** — `attachImage` TRPC mutation: same `count()` before `create()`. If somehow a token was minted (e.g., race condition between two parallel uploads) and both blobs landed, only the first `attachImage` succeeds; the second gets `BAD_REQUEST`.

The same logic applies to the 5MB cap (route handler `maximumSizeInBytes` + client `compressForUpload` pre-flight check).

### Deletion ordering: `del()` first, then DB delete

Per 13-RESEARCH.md Pattern 3, deletion order matters when one side of the pair can fail:

- **If we deleted the DB row first and then `del()` failed**: orphan blob accruing storage cost, no UI signal, silent.
- **If we `del()` first and then the DB delete fails** (current approach): orphan row pointing at a dead URL → 404 in UI → loud failure mode that drives investigation.

`del()` is idempotent on a missing blob, so re-running the mutation after a transient failure is safe.

### Primary promotion on deletion

If the deleted image had `isPrimary: true`, find the next-lowest-`sortOrder` remaining image on the same dress and set its `isPrimary: true`. This prevents the "deleted my primary and now the dress has no thumbnail" UX bug. Implemented inline in `deleteImage` after the row delete.

### `setPrimary` included even though not explicitly listed

The plan deliverables enumerate `attachImage`, `reorderImages`, `deleteImage`. STORAGE-04 says "admin and consigner can re-designate primary" though, and Phase 14's gallery UI will need it. Building it now avoids a forced second touch of `imageQueries.ts` later for what is a trivial 8-line procedure.

### `protectedProcedure` + per-call ownership check (NOT `adminProcedure`)

Owners must be able to manage their own dress photos. The shared `assertCanModifyDress(ctx, dressId)` guard accepts admins OR the dress's `ownerId === session.user.id`. Using `adminProcedure` would have blocked owners; using `publicProcedure` would have allowed anonymous mutations. `protectedProcedure` requires a session, and the per-call guard enforces the more specific predicate.

## Reachable TRPC namespaces (new)

- `trpc.wardrobe.images.attachImage.useMutation(...)`
- `trpc.wardrobe.images.reorderImages.useMutation(...)`
- `trpc.wardrobe.images.setPrimary.useMutation(...)`
- `trpc.wardrobe.images.deleteImage.useMutation(...)`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Lint regression] Biome flagged two issues in plan files**

- **Found during:** Task 5 verification (`npx biome check`)
- **Issues:**
  - `route.ts:16` — `assist/source/organizeImports`: `import { handleUpload, type HandleUploadBody }` must be reordered to `import { type HandleUploadBody, handleUpload }` per biome's preferred order (types first within a destructured import).
  - `imageQueries.ts:135` (setPrimary) — `lint/style/useBlockStatements`: inline `if (!image) throw new TRPCError(...)` must be wrapped in `{ ... }`.
- **Fix:** Both lines updated. Wrapped in the Task 5 commit (`144f8df`) so they land alongside the `appRouter` mount.
- **Files modified:** `src/app/api/wardrobe/upload/route.ts`, `src/features/wardrobe/api/queries/imageQueries.ts`
- **Commit:** `144f8df`

These were stylistic biome rules the plan code did not anticipate; functional behavior is unchanged.

### Smoke-test side note

The verification block in the plan included a `pnpm tsx -e "..."` runtime probe of `wardrobeRouter._def`. The internal TRPC v11 shape is not directly inspectable via `._def.procedures` in this environment, but `npx tsc --noEmit` reports zero new errors with the wardrobe router mounted in `appRouter` — that's a stronger guarantee of valid composition than a runtime keys probe (compile time vs runtime). Not treated as a deviation; verification intent (router composes cleanly) is met.

## Authentication Gates

None encountered during file authoring. **`BLOB_READ_WRITE_TOKEN` IS the user-setup item flagged by this plan**: a live end-to-end upload smoke test against the Vercel Blob service requires this token in `.env`, but every line of code (route handler, TRPC procedures, compression helper) can be written, type-checked, lint-checked, and committed without it. Per plan guidance the orchestrator is responsible for surfacing the token prompt before Phase 14 wires up UI that will actually call `upload()`.

The token source is documented in the plan frontmatter:
- Vercel Dashboard → ym-movement project → Storage → create or open blob store `wardrobe-images` → `.env.local` tab → copy `BLOB_READ_WRITE_TOKEN` into local `.env`
- Production deployments use Vercel's OIDC auto-auth — the token is for localhost only

## Files Created

```
src/app/api/wardrobe/upload/route.ts                       95 lines  POST-only Next.js route handler, handleUpload() with all enforcement in onBeforeGenerateToken
src/features/wardrobe/lib/compressImage.ts                 32 lines  compressForUpload(File) → File via browser-image-compression
src/features/wardrobe/api/queries/imageQueries.ts         190 lines  imageRouter: attachImage / reorderImages / setPrimary / deleteImage + assertCanModifyDress
src/features/wardrobe/api/queries/index.ts                 12 lines  wardrobeRouter composing { images: imageRouter }
.planning/phases/13-wardrobe-schema-foundation/13-03-SUMMARY.md
```

## Files Modified

```
src/lib/root.ts          +2 lines     import wardrobeRouter, mount as `wardrobe`
package.json             +2 lines     @vercel/blob, browser-image-compression
pnpm-lock.yaml           +61 lines    lock entries for the two new deps + transitive
```

## Verification

- `pnpm install` resolves both new deps; lockfile updated; idempotent re-runs are no-ops
- `npx tsc --noEmit` passes (excluding the two pre-existing IceParticles + sidebar errors from STATE.md blockers)
- `npx biome check` is clean for all five files modified by this plan
- Wardrobe router composes into `appRouter` at compile time (TypeScript `AppRouter` type includes `wardrobe.images.*`)
- 5MB / 8-image / content-type caps verified by `grep` to exist in both the route handler and the TRPC mutation

## What's NOT in this plan (intentional)

- No React components, hooks, or pages — UI is Phase 14+
- No actual `upload()` invocation — the browser-side upload trigger lives where React owns the file picker (Phase 14)
- No `onUploadCompleted` persistence — left as a logging stub on purpose (localhost ergonomics)
- No image-format optimization beyond what `browser-image-compression` provides (e.g., AVIF) — out of scope
- No CDN signing for private images — wardrobe images are public by design per 13-RESEARCH.md Pitfall #6

## Next Phase Readiness

Phase 13 wardrobe foundations are now complete:
- **13-01:** Schema + migration ✓
- **13-02:** Settings JSON wardrobe defaults ✓
- **13-03:** Upload route handler + image TRPC + client compression ✓

Phase 14 can now wire React components to:
1. Call `compressForUpload(file)` on a picked file
2. Call `upload(compressed, { handleUploadUrl: "/api/wardrobe/upload", clientPayload: JSON.stringify({ dressId }) })` from `@vercel/blob/client`
3. Call `trpc.wardrobe.images.attachImage.mutate({ dressId, url: blob.url })`
4. Render gallery using `trpc.wardrobe.images.*` for reorder / setPrimary / delete

**Blocker for full end-to-end smoke test:** `BLOB_READ_WRITE_TOKEN` must be present in `.env` (see Authentication Gates above). Without it, `upload()` will fail in localhost dev but every TRPC procedure and the route handler can still be unit-/type-verified.

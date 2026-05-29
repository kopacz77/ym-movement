# Phase 20: Wardrobe Notifications — Research

**Researched:** 2026-05-29
**Domain:** Transactional email + scheduled cron jobs (Resend + Next.js App Router)
**Confidence:** HIGH (all findings sourced from direct file reads in this repo)

## Executive Summary

Phase 20 is **9 email helpers + 9 paste-in call-site additions + 1 cron job extension** — there is essentially no new infrastructure required. The repo already has every primitive needed: Resend wired in `src/lib/email.ts`, a cron route protected by `CRON_SECRET` at `src/app/api/cron/send-batch-emails/route.ts`, the `createNotification` helper that all 7 Phase 17 mutations + 3 Phase 18/19 mutations already call (in try/catch), and even an established admin-recipient resolution pattern (`ADMIN_NOTIFICATION_EMAIL` env var for single-target email; `prisma.user.findMany({ where: { role: "ADMIN" } })` for fan-out in-app notifications). The work is overwhelmingly **mechanical**: define each helper alongside `sendPaymentReminderEmail` (which is the closest structural template), then insert one `try { await sendXxxEmail(...) } catch { console.error(...) }` block beside each existing `createNotification` call. **Recommended split: 3 plans — 20-01 adds 9 helpers (single file diff to `src/lib/email.ts`), 20-02 wires 8 immediate-trigger helpers to mutation call sites + NEW admin-fan-out for NOTIFY-01, 20-03 builds a NEW `/api/cron/wardrobe-return-reminders` route + `vercel.json` cron entry for NOTIFY-07.** This split parallelizes well (20-01 has zero downstream conflicts; 20-02 and 20-03 can run concurrently after 20-01 lands).

**Primary recommendation:** Mirror `sendPaymentReminderEmail` (lines 426-514 of `src/lib/email.ts`) line-for-line as the canonical template — it's the only existing helper that already uses navy `#1a3a5c` headers + cyan `#0891b2` accents AND has the fee-box + CTA-button + signoff pattern that 8 of the 9 new templates need. Do not invent a new template system.

---

## Email Infrastructure Audit

### Current `src/lib/email.ts` Pattern (HIGH confidence)

**File:** `/home/kopacz/projects/ym-movement/src/lib/email.ts` (672 lines, single-file containing all 11 current helpers)

**Critical primitives (lines 1-78):**
- `sendEmail(to, subject, html)` — internal helper (line 56). Throws on Resend error. In non-prod, missing `RESEND_API_KEY` is a no-op warning; in prod, missing key throws (silent-misconfig caused 15-day outage on 2026-04-21 — guard is intentional).
- `resolveBaseUrl()` — exported helper (line 25). Reads `NEXT_PUBLIC_BASE_URL → NEXTAUTH_URL → "https://ym-movement.com"`. **MUST be called inside each helper function**, not at module level (Vercel cold-start caching bug, 2026-04-27 incident).
- `EMAIL_CONFIG = { from: "YM Movement <info@ym-movement.com>", replyTo: "info@ym-movement.com" }` — line 44.
- `formatDate(date, timezone)` and `formatTime(date, timezone)` — Luxon-based formatters (lines 83-117). All wardrobe templates should default to `"America/Los_Angeles"` for return-reminder dates (no per-tenant timezone yet).
- Module imports: `Resend` from `resend`, `DateTime` from `luxon`, `REGISTRATION_TOKEN_EXPIRY_HOURS` from `@/lib/auth-tokens`.

**Canonical helper signature template** (mirror this verbatim):
```typescript
/**
 * Sends [WHO] when [WHAT].
 */
export async function sendXxxEmail(
  recipientEmail: string,
  recipientName: string,
  data: {
    /* domain payload */
  },
) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #1a3a5c;">[ICON] [TITLE]</h1>
      <p>Hello ${recipientName},</p>
      <p>[OPENING LINE]</p>

      [DETAIL CARDS]

      <div style="text-align: center; margin: 30px 0;">
        <a href="${resolveBaseUrl()}/[path]" style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          [CTA LABEL]
        </a>
      </div>

      <p style="margin-top: 20px;">Best regards,</p>
      <p>The YM Movement Team</p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated notification.</p>
      </div>
    </div>
  `;

  return sendEmail(recipientEmail, "[SUBJECT]", emailContent);
}
```

**Templates inline as HTML strings** — there is NO separate template file, NO React-email integration, NO MJML. The pattern is template-literal HTML with `${}` interpolation. Stick to this — do not introduce a templating library.

### Existing Scheduler Mechanism (HIGH confidence)

**Cron entry point:** `src/app/api/cron/send-batch-emails/route.ts` (72 lines)
- Auth: Bearer token via `CRON_SECRET` env var, validated with `safeCompare(authHeader, "Bearer ${cronSecret}")` (timing-safe). Dev mode skips auth.
- Supports `POST` (cron-triggered) + `GET` (dev-only manual trigger).
- Delegates business logic to `sendBatchEmailNotifications()` in `src/lib/batch-email-sender.ts`.

**Existing batch loop pattern** (`src/lib/batch-email-sender.ts`, lines 12-114):
1. Query `prisma.pendingEmailNotification.findMany({ where: { sentAt: null } })` — find unprocessed work.
2. Group by `userId` into a Map.
3. For each user: lookup `prisma.user.findUnique({ where: { id: userId } })`, call `sendScheduleChangesEmail()`, then `updateMany({ id: { in: [...] }, data: { sentAt: new Date() } })` to mark sent.
4. Per-user try/catch around the email send (one user's failure does not block others).
5. Returns `{ success, stats }` with `usersProcessed / emailsSent / errors / notificationsMarkedSent` counts.

**Critical observation:** the existing cron is NOT a "row-specific schedule" — it iterates ALL pending rows on each tick. This means **NOTIFY-07 cannot piggyback on it** because the existing job marks rows `sentAt` once-and-done. The return-reminder needs a DIFFERENT loop: "find rentals where endDate falls within wardrobeReturnReminderDays AND no reminder sent yet". The simplest is a new route `/api/cron/wardrobe-return-reminders` with its own loop + a `returnReminderSentAt: DateTime?` column added to `Rental`.

**No `vercel.json` exists at the repo root** — the existing batch-emails job is wired via Vercel Dashboard cron schedule (or manually invoked). Phase 20 should add a `vercel.json` with the explicit cron declaration for the new wardrobe-return-reminder route AND the existing batch-emails route (so all crons are checked into git).

### Existing Email-Trigger Pattern (HIGH confidence)

Two patterns in use:

**(A) Fire-and-forget try/catch (single Promise, await):** Used everywhere a TRPC mutation fires a notification — e.g., `wardrobeRequestQueries.ts:248-261` (respondToRequest), `wardrobeRequestQueries.ts:362-372` (markPaymentReceived), `wardrobeRequestQueries.ts:561-571` (releaseDeposit), `wardrobeRentalRouter.markConsignmentPaidOut:672-682`. Pattern:
```typescript
try {
  await createNotification({ ... });
} catch (err) {
  console.error("[WARDROBE] Failed to notify ...:", err);
}
```
**This is the pattern Phase 20 should follow.** Add the `await sendXxxEmail(...)` call INSIDE the SAME try block (one try, two awaits), or add a SECOND parallel try block immediately below. Both are correct; the SECOND-try variant is slightly more resilient (in-app succeeds even if email fails). **Recommend SECOND-try variant** so an email outage never suppresses the in-app inbox row.

**(B) Promise.allSettled (parallel best-effort):** Used at `src/app/api/auth/signup/route.ts:259-267` where welcome-email AND admin-notification fire concurrently. Useful when both are independent and you want to report both results back to the UI. Phase 20 does NOT need this pattern — wardrobe mutations only fire 1 email + 1 in-app each.

---

## Per-Template Data Requirements

Each row identifies the INSERTION POINT in the existing code, the RECIPIENT, the PAYLOAD shape (everything already in scope at the call site — no new prisma queries needed), the SUBJECT line, and the CTA destination.

### NOTIFY-01: `sendConsignerDressSubmittedEmail`
- **Fires to:** All admins/super-admins (fan-out)
- **Insertion point:** `src/features/wardrobe/api/queries/consignerQueries.ts:155` (after `prisma.dress.create`) AND `:236` (after `resubmit` mutation). Currently NO `createNotification` call exists at consigner.create — Phase 20 must ADD both the in-app notification AND the email. (Phase 18 left this blank intentionally per STATE.md.)
- **Recipient resolution:** `prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { id: true, email: true, name: true } })` + iterate. Optional: fallback to `process.env.ADMIN_NOTIFICATION_EMAIL` if no admin users found (mirrors `sendAdminSignupNotification` pattern at email.ts:182).
- **Payload:** `{ consignerName: user.name, dressTitle: input.title, dressCategory: input.category, isResubmit: boolean }`
- **Subject:** `New consigner dress: ${title}` (or `Resubmitted consigner dress: ${title}` for resubmit)
- **CTA:** `${resolveBaseUrl()}/admin/wardrobe?status=PENDING_APPROVAL`
- **In-app notification:** Also fan-out — `createNotificationForMultipleUsers(adminIds, { title: "New consigner submission", message: \`${consignerName} submitted ${dressTitle}\`, type: "INFO", link: "/admin/wardrobe?status=PENDING_APPROVAL" })`. Helper already exists at `notificationHelpers.ts:32`.

### NOTIFY-02: `sendConsignerDressApprovedEmail`
- **Fires to:** Consigner (the dress owner)
- **Insertion point:** `src/features/admin/api/queries/wardrobeDressQueries.ts:358` (inside existing try/catch at approveDress, immediately after the existing `createNotification` call).
- **Recipient resolution:** Already have `dress.ownerId`. Need to fetch `prisma.user.findUnique({ where: { id: dress.ownerId }, select: { email: true, name: true } })` — add a small lookup to the existing `findUnique` selection at line 309-318 (just include `Owner: { select: { email: true, name: true } }`).
- **Payload:** `{ consignerName, dressTitle: dress.title, dressId: dress.id, commissionPct: input.consignmentCommissionPctOverride ?? dress.consignmentCommissionPct }`
- **Subject:** `🎉 Your dress "${dressTitle}" is live on YM Wardrobe`
- **CTA:** `${resolveBaseUrl()}/wardrobe/consigned/${dressId}/edit`

### NOTIFY-03: `sendConsignerDressRejectedEmail`
- **Fires to:** Consigner
- **Insertion point:** `wardrobeDressQueries.ts:406` (inside existing try/catch at rejectDress).
- **Recipient resolution:** Same as NOTIFY-02 — extend the `findUnique` `select` to include Owner email/name.
- **Payload:** `{ consignerName, dressTitle, rejectionReason: input.reason, dressId }`
- **Subject:** `Your dress "${dressTitle}" needs changes`
- **CTA:** `${resolveBaseUrl()}/wardrobe/consigned/${dressId}/edit`

### NOTIFY-04: `sendRentalRequestReceivedEmail`
- **Fires to:** Dress owner (Yura OR consigner) — NOT the requesting student.
- **Insertion point:** `src/features/wardrobe/api/queries/requestQueries.ts:240` (inside existing try/catch at create).
- **Recipient resolution:** Extend the existing `findUnique` at line 157-160 to include `Owner: { select: { email: true, name: true } }`. Currently fetches `ownerId` only.
- **Payload:** `{ ownerName, dressTitle, studentName: student.User.name, rentalType: input.rentalType, startDate, endDate, competitionName, competitionDate, message: input.message }`
- **Subject:** `New rental request for "${dressTitle}"`
- **CTA:** `${resolveBaseUrl()}/admin/wardrobe/requests` (owner-side queue is currently admin-only; consigner-side queue is a future enhancement — for now BOTH groups click through to admin view; consigners viewing admin URL will hit a 403, which is acceptable since the email also contains the full request details inline)

### NOTIFY-05: `sendRentalDecisionEmail`
- **Fires to:** Requesting student
- **Insertion point:** `src/features/admin/api/queries/wardrobeRequestQueries.ts:261` (inside existing try/catch at respondToRequest). The mutation already discriminates with `isApprove` on line 249.
- **Recipient resolution:** Extend the existing inner select at line 191 to include `Student.User.email`.
- **Payload (discriminated union):**
  - APPROVE branch: `{ decision: "APPROVED", studentName, dressTitle, responseMessage, totalDue: rentalFee + cleaningFee + securityDeposit, paymentInstructions: { venmo: "@yura-min", zelle: "(714) 743-7071" }, requestId }`
  - DECLINE branch: `{ decision: "DECLINED", studentName, dressTitle, responseMessage }`
- **Recommendation:** **ONE helper with a discriminated `decision: "APPROVED" | "DECLINED"` field.** Reasons: (a) the existing in-app notification is one call with an `isApprove` branch — mirror that; (b) both emails share the same recipient-name header, same brand band, same footer — only the middle card differs; (c) keeps the import list at the call site to one symbol. Inside the helper, branch on `data.decision` to render the right middle block.
- **Subject:** `${decision === "APPROVED" ? "✅ Approved" : "Update on"}: your rental request for "${dressTitle}"`
- **CTA:** `${resolveBaseUrl()}/wardrobe/my-rentals`

### NOTIFY-06: `sendRentalConfirmedEmail`
- **Fires to:** Requesting student
- **Insertion point:** `wardrobeRequestQueries.ts:372` (inside existing try/catch at markPaymentReceived).
- **Recipient resolution:** Extend inner select at line 302 to include `Student.User.email`.
- **Payload:** `{ studentName, dressTitle, rentalType, startDate, endDate, totalCharged, paymentMethod }`
- **Subject:** `🎉 Your rental of "${dressTitle}" is confirmed`
- **CTA:** `${resolveBaseUrl()}/wardrobe/my-rentals`

### NOTIFY-07: `sendReturnReminderEmail` (cron-driven)
- **Fires to:** Student renting the dress
- **Insertion point:** NEW file `src/app/api/cron/wardrobe-return-reminders/route.ts` + NEW helper `src/lib/wardrobe-return-reminder-sender.ts` (mirror `batch-email-sender.ts` structure exactly).
- **Cron loop pattern:**
  ```typescript
  const settings = await getWardrobeSettings(prisma);
  const reminderWindowEnd = addDays(new Date(), settings.wardrobeReturnReminderDays);
  const rentals = await prisma.rental.findMany({
    where: {
      paymentStatus: { in: ["PAID", "RETURNED"] }, // active rentals (not yet DEPOSIT_RELEASED)
      endDate: { lte: reminderWindowEnd, gte: new Date() }, // upcoming within window
      returnReminderSentAt: null, // not yet reminded
    },
    select: {
      id: true, endDate: true,
      Dress: { select: { title: true } },
      Student: { select: { User: { select: { email: true, name: true } } } },
    },
  });
  // for each rental: send email + update returnReminderSentAt
  ```
- **Schema change required:** Add `returnReminderSentAt DateTime?` to `Rental` model in `prisma/schema.prisma`. Migration name: `add_rental_return_reminder_sent_at`. Run with `pnpm prisma:migrate` (NEVER `migrate dev`).
- **Payload:** `{ studentName, dressTitle, endDate, daysUntilDue: settings.wardrobeReturnReminderDays }`
- **Subject:** `⏰ Return reminder: "${dressTitle}" due ${formatDate(endDate, "America/Los_Angeles")}`
- **CTA:** `${resolveBaseUrl()}/wardrobe/my-rentals`
- **Cron schedule recommendation:** Daily at 9 AM Pacific (17:00 UTC, configurable). Add to `vercel.json`:
  ```json
  { "crons": [
    { "path": "/api/cron/wardrobe-return-reminders", "schedule": "0 17 * * *" },
    { "path": "/api/cron/send-batch-emails", "schedule": "0 4 * * *" }
  ]}
  ```

### NOTIFY-08: `sendDepositReleasedEmail`
- **Fires to:** Student
- **Insertion point:** `wardrobeRequestQueries.ts:571` (inside existing try/catch at releaseDeposit).
- **Recipient resolution:** Extend inner select at line 528 to include `Student.User.email`.
- **Payload:** `{ studentName, dressTitle, depositAmount: rental.securityDeposit, releasedAt: new Date() }` — note: existing select does NOT include `securityDeposit`; extend it or fetch separately.
- **Subject:** `Your security deposit for "${dressTitle}" has been released`
- **CTA:** `${resolveBaseUrl()}/wardrobe/my-rentals`

### NOTIFY-09: `sendConsignmentPayoutSentEmail`
- **Fires to:** Consigner (dress owner)
- **Insertion point:** `wardrobeRequestQueries.ts:682` (inside existing try/catch at markConsignmentPaidOut).
- **Recipient resolution:** Extend inner select at line 638 — currently `Dress.Owner: { select: { id: true, name: true } }`, add `email: true`.
- **Payload:** `{ consignerName, dressTitle, payoutAmount: rental.consignmentPayoutAmount, paidOutAt: new Date() }`
- **Subject:** `💸 Your payout for "${dressTitle}" has been sent`
- **CTA:** `${resolveBaseUrl()}/wardrobe/consigned?tab=earnings`

---

## Scheduler Strategy

**Decision: NEW cron route, NEW sender library, MIGRATE schema.**

- **Why NOT extend `send-batch-emails`:** The existing job's loop consumes `PendingEmailNotification` rows (mark `sentAt`, never reprocess). The return-reminder is conceptually different — it polls `Rental` rows on a window predicate. Coupling them would require either (a) preinsterting `PendingEmailNotification` stubs at rental-create time and filtering by date (fragile — settings can change mid-rental), or (b) overloading the row processor with type-discriminated branches (violates single-responsibility).
- **NEW files:**
  - `src/app/api/cron/wardrobe-return-reminders/route.ts` — copy `send-batch-emails/route.ts` verbatim (51 lines), swap the imported sender.
  - `src/lib/wardrobe-return-reminder-sender.ts` — copy `batch-email-sender.ts` skeleton, replace the `pendingEmailNotification.findMany` with the `rental.findMany` window predicate above, replace the email helper call with `sendReturnReminderEmail`.
- **Schema migration:** Add ONE column. Migration is additive and zero-downtime:
  ```prisma
  model Rental {
    // existing fields...
    returnReminderSentAt DateTime?
  }
  ```
- **Cron registration:** Create `vercel.json` at repo root with both crons declared (existing batch-emails was previously dashboard-configured; declaring it in vercel.json puts it in version control). Verify with the user before changing the existing batch-emails schedule (current production timing is unknown without dashboard access).

---

## Brand Palette Code Snippets (Paste-Ready)

Pulled verbatim from `src/lib/email.ts` lines 457-514 (`sendPaymentReminderEmail`). All 9 new templates should use these exact strings.

### Header band (navy, primary)
```html
<h1 style="color: #1a3a5c;">[ICON] [TITLE]</h1>
```

### Detail card (cyan left border, blue tint background) — for primary info
```html
<div style="background-color: #f0f9ff; border-left: 4px solid #0891b2; padding: 20px; margin: 20px 0; border-radius: 4px;">
  <h2 style="color: #1a3a5c; margin-top: 0;">[CARD TITLE]</h2>
  <ul style="list-style: none; padding: 0;">
    <li style="margin-bottom: 8px;">💰 <strong>[Label]:</strong> [value]</li>
  </ul>
</div>
```

### Secondary callout card (lighter cyan border, for instructions)
```html
<div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 4px;">
  <h2 style="color: #0c4a6e; margin-top: 0;">[CARD TITLE]</h2>
  <p>[content]</p>
</div>
```

### Reference-code highlight box (cyan emphasized value)
```html
<div style="background-color: #fff; padding: 15px; border-radius: 4px; margin-top: 15px;">
  <p style="margin: 0; font-size: 14px;">⚠️ <strong>Important:</strong> [warning text]</p>
  <p style="font-size: 20px; font-weight: bold; margin: 10px 0; color: #0891b2; background-color: #f8f9fa; padding: 8px; border-radius: 4px; text-align: center;">[CODE OR VALUE]</p>
</div>
```

### Primary CTA button (cyan, the standard)
```html
<div style="text-align: center; margin: 30px 0;">
  <a href="${resolveBaseUrl()}/[path]"
     style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
    [CTA LABEL]
  </a>
</div>
```

### Warning/amber box (for "needs changes" / "action required")
```html
<div style="margin-top: 25px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
  <p style="margin: 0; font-size: 14px; color: #92400e;"><strong>⏰ Important:</strong> [warning text]</p>
</div>
```

### Footer (signoff + automated-message disclaimer)
```html
<p style="margin-top: 30px;">[Closing line — thanks/cta/etc.]</p>

<p style="margin-top: 20px;">Best regards,</p>
<p>The YM Movement Team</p>

<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
  <p style="margin: 0;">This is an automated notification. Please do not reply directly to this email.</p>
</div>
```

### Container wrapper (open + close of every template)
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  [body content]
</div>
```

**Anti-pattern to AVOID:** Do NOT use `#3b82f6` (the old blue) — `sendAdminSignupNotification`, `sendCoachWelcomeEmail`, `sendCoachInvitationEmail`, `sendCoachApprovalEmail` (lines 197, 573, 605, 645) still use it because they predate the 2026-04-26 brand sweep. Phase 20 templates use cyan `#0891b2` exclusively, EXCEPT for the navy header `#1a3a5c` (matches `sendPaymentReminderEmail`). Optional follow-up bug ticket: backport cyan to the 4 lagging templates — but that's NOT Phase 20 scope.

---

## Open Questions — Answered

1. **Q: Helper signature and template pattern?**
   A: HIGH-confidence — see "Canonical helper signature template" above. Inline HTML template literals. `(recipientEmail, recipientName, data) → sendEmail(...)`. No template library. Single file (`src/lib/email.ts`) gets 9 new exports appended.

2. **Q: Scheduler entry point for NOTIFY-07?**
   A: HIGH-confidence — `src/app/api/cron/send-batch-emails/route.ts` is the existing pattern. Loop logic at `src/lib/batch-email-sender.ts:12-114`. Trigger: external cron POSTs with `Authorization: Bearer ${CRON_SECRET}`. The new wardrobe-return-reminder route at `src/app/api/cron/wardrobe-return-reminders/route.ts` mirrors this exactly.

3. **Q: Per-template payload data?**
   A: HIGH-confidence — every needed field is already in scope at each call site (the existing `createNotification` calls have them all). Minor `findUnique` select extensions are needed to add `email` alongside the already-fetched `id` / `name`. Exact details enumerated in NOTIFY-01..09 sections above.

4. **Q: try/catch non-blocking?**
   A: HIGH-confidence — yes. Use the **SECOND-try variant** (separate try block from the existing in-app `createNotification` try block). This ensures an email outage never suppresses the in-app inbox. Console.error on failure (matches Pattern A in this codebase).

5. **Q: NOTIFY-01 recipient — single admin email or fan-out?**
   A: HIGH-confidence — **fan-out via `prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } })`** with `ADMIN_NOTIFICATION_EMAIL` env var as fallback if no admin users exist. Reasoning: (a) Phase 17's `bookingQueries.ts:408` already establishes the fan-out pattern for admin in-app notifications; (b) `sendAdminSignupNotification` (line 176 of email.ts) shows the env-var fallback. **Recommendation: fan-out email to ALL admin users by default, fall back to env var if none found.** Decision can be deferred to Plan 20-01 (or asked of user) — both implementations are simple.

6. **Q: NOTIFY-05 — one helper or two?**
   A: HIGH-confidence — **ONE helper with a discriminated `decision: "APPROVED" | "DECLINED"` field**. Three reasons: (a) call site already branches with `isApprove` on one variable — mirror that locality; (b) the entire wrapper (greeting + brand band + footer + signoff) is identical; only the middle card differs; (c) keeps the import surface minimal.

7. **Q: NOTIFY-07 — new cron job or piggyback?**
   A: HIGH-confidence — **NEW cron job** (`/api/cron/wardrobe-return-reminders`). The existing job consumes-and-marks `PendingEmailNotification` rows; return-reminders are window-predicate polls of `Rental` rows. They have different lifetimes, different data sources, and different idempotency strategies. Adding one column (`Rental.returnReminderSentAt`) makes the new job trivially idempotent.

8. **Q: Exact brand snippets?**
   A: HIGH-confidence — see "Brand Palette Code Snippets" above. All seven reusable HTML fragments are extracted from `sendPaymentReminderEmail` verbatim. Paste-and-modify ready.

9. **Q: Email helper tests pattern?**
   A: HIGH-confidence — pattern exists. See `__tests__/lib/admin-signup-notification.test.ts` (uses `vi.mock("resend", () => ...)` + `sendMock` + reads `args.html`/`args.subject`/`args.to`). Phase 21 owns wardrobe testing per ROADMAP — **Phase 20 does NOT add tests**. Defer all test coverage to Phase 21 (TEST-01..08). Mention this fact in Plan 20 so the planner doesn't accidentally create tests.

10. **Q: Plan breakdown?**
    A: See "Plan Breakdown Recommendation" below. **3 plans total** (NOT 1 mega-plan, NOT 4-piece overengineering). Rationale: 20-01 has zero overlap with downstream files; 20-02 + 20-03 touch disjoint file sets and can run in parallel after 20-01.

---

## Plan Breakdown Recommendation

**3 plans. Total task count: ~17. Two waves.**

### Plan 20-01 — Add 9 email helpers to `src/lib/email.ts`
- **Single file diff:** appends ~600 lines to `src/lib/email.ts`. Zero downstream conflicts.
- **Tasks:** ~9 (one per helper) + 1 export-audit task.
- **Depends on:** nothing.
- **Wave:** 1.
- **Verification:** `pnpm type-check` passes; `pnpm build` passes; each helper has correct signature (consistent first-two-args = email, name).

### Plan 20-02 — Wire 8 immediate-trigger emails to mutation call sites
- **Files modified:**
  - `src/features/wardrobe/api/queries/consignerQueries.ts` (NOTIFY-01 × 2 call sites: create + resubmit — ADDS new in-app notification + email)
  - `src/features/admin/api/queries/wardrobeDressQueries.ts` (NOTIFY-02 approveDress, NOTIFY-03 rejectDress — extend Owner select to include email; add email send beside existing createNotification)
  - `src/features/wardrobe/api/queries/requestQueries.ts` (NOTIFY-04 create — extend Owner select; add email send)
  - `src/features/admin/api/queries/wardrobeRequestQueries.ts` (NOTIFY-05 respondToRequest, NOTIFY-06 markPaymentReceived, NOTIFY-08 releaseDeposit, NOTIFY-09 markConsignmentPaidOut — extend Student.User/Owner selects; add email send beside each existing createNotification)
- **Tasks:** ~8 (one per call site, since each is a self-contained edit). Plus 1 audit pass.
- **Depends on:** 20-01 (the helpers must exist before they're called).
- **Wave:** 2.
- **Verification:** `pnpm type-check`; manually trace each mutation in DevTools (TRPC inspector) and confirm Resend dashboard shows the corresponding email.

### Plan 20-03 — NOTIFY-07 return-reminder cron infrastructure
- **Files NEW:**
  - `src/app/api/cron/wardrobe-return-reminders/route.ts` (~50 lines, copy from send-batch-emails)
  - `src/lib/wardrobe-return-reminder-sender.ts` (~80 lines, copy skeleton from batch-email-sender)
  - `vercel.json` (cron declarations)
  - `prisma/migrations/YYYYMMDDHHMMSS_add_rental_return_reminder_sent_at/migration.sql` (one ADD COLUMN)
- **Files MODIFIED:**
  - `prisma/schema.prisma` (add `returnReminderSentAt DateTime?` to Rental)
- **Tasks:** ~5 (schema, migration via `pnpm prisma:migrate`, cron route, sender lib, vercel.json).
- **Depends on:** 20-01 (needs `sendReturnReminderEmail`); independent of 20-02 (can run in parallel).
- **Wave:** 2 (parallel with 20-02).
- **Verification:** Curl the GET endpoint locally with a rental endDate set 1 day out → email arrives in dev inbox; row's `returnReminderSentAt` is updated; second invocation does NOT re-send.

### Why 3 plans, not 1 mega-plan or 4 sub-plans
- **Why not 1 mega-plan:** the file-diff fan-out is wide (8 mutation files in Plan 20-02 alone) — one task per call site keeps the diff reviewable and lets the planner verify each insertion point independently. A monolithic plan risks "I edited file X, did I remember to extend the select in file Y?" drift.
- **Why not 4-piece (split 20-02 by file):** Plan 20-02's edits are SO mechanical (paste a 3-line try block beside an existing 3-line try block) that bundling them is faster than enforcing strict 1-file-per-plan splits. The 8 edits share the same review checklist (extend select → add try/catch → console.error on failure) — keep them together.
- **Why 20-03 is its own plan:** new infra (cron route + new lib file + schema migration + vercel.json) is qualitatively different from "modify existing mutation" work. Different verification steps. Different risk profile (schema migration + Vercel cron registration are the only things in this entire phase that could break production).

---

## Risks + Mitigations

### Risk 1: Resend rate limits / outage cascading into mutation failure
- **Mitigation (built-in):** Every email send is in a try/catch with `console.error` — mutation succeeds even if Resend is down or rate-limited. Verified pattern in 4+ existing call sites.
- **Resend default limits (HIGH confidence from Context7-class knowledge):** 100 emails/day on free tier; transactional sends typically under 10/day per phase. Should comfortably fit. If a real outage hits, in-app notifications continue working (different code path) — users still see inbox items.

### Risk 2: Email-to-self loops on NOTIFY-01 (admin submits their own consigner dress)
- **Mitigation:** Admins typically use `admin.wardrobe.create` (not consigner submission), which bypasses `PENDING_APPROVAL` (sets `AVAILABLE` directly per `wardrobeDressQueries.ts:178`). But if an admin DOES go through `consignerQueries.create`, the fan-out will include their own user — they'll get an email about their own submission. Two options: (a) accept it (one extra inbox item; not a real bug); (b) filter `where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, id: { not: ctx.session.user.id } }`. **Recommend (a) — accept it.** Simpler and matches `bookingQueries.ts` behavior where an admin booking a lesson notifies all admins including themselves.

### Risk 3: NOTIFY-01 recipient resolution returns empty (no admin users)
- **Mitigation:** Fallback to `process.env.ADMIN_NOTIFICATION_EMAIL` (matches `sendAdminSignupNotification` pattern at email.ts:182). If BOTH are empty: log and skip (do not throw — mutation must succeed).

### Risk 4: NOTIFY-07 sends duplicate reminders on cron re-runs
- **Mitigation:** `Rental.returnReminderSentAt` column + `where: { returnReminderSentAt: null }` predicate makes the loop strictly idempotent. Each rental gets at most one reminder.

### Risk 5: NOTIFY-07 timing mismatch (settings.wardrobeReturnReminderDays changed mid-rental)
- **Mitigation:** The cron reads `getWardrobeSettings()` on every tick, so admin changes to `wardrobeReturnReminderDays` take effect at the next 9 AM tick. No data is cached. If admin shortens the window, some rentals that previously didn't match may now match — they'll get a reminder. If admin lengthens it, more rentals match — also fine. The `returnReminderSentAt = null` guard prevents any duplicate sends.

### Risk 6: Schema migration on Rental table during active rentals
- **Mitigation:** Adding a nullable column is zero-downtime. No data backfill needed. Verify with `pnpm db:check` before AND after.

### Risk 7: Vercel cron schedule conflict with existing dashboard-configured batch-emails cron
- **Mitigation:** When introducing `vercel.json` with both cron entries, the file-defined schedule REPLACES any dashboard config. **MUST verify with user** what the current production batch-emails cron schedule is (likely "0 4 * * *" / 4 AM UTC = 8 PM Pacific, matching the code comment "once per day at 8 PM") and preserve it exactly. The Plan 20-03 plan should call this out as a checkpoint task: "before adding vercel.json, confirm with user the current Vercel-dashboard cron schedule for send-batch-emails so it can be replicated exactly."

### Risk 8: Brand sweep regression (4 existing emails still use #3b82f6 blue)
- **Mitigation:** Out of scope for Phase 20. Phase 20 only adds NEW templates — those use cyan #0891b2. Bug ticket can be filed separately. NOTIFY-10 acceptance is satisfied as long as ALL 9 NEW templates use the correct palette.

---

## File-by-File Change List

### NEW files
- **NEW** `src/lib/wardrobe-return-reminder-sender.ts` — return-reminder cron loop (Plan 20-03)
- **NEW** `src/app/api/cron/wardrobe-return-reminders/route.ts` — cron route handler (Plan 20-03)
- **NEW** `vercel.json` — cron schedule declarations (Plan 20-03)
- **NEW** `prisma/migrations/YYYYMMDDHHMMSS_add_rental_return_reminder_sent_at/migration.sql` — schema migration (Plan 20-03)

### MODIFY files
- **MODIFY** `src/lib/email.ts` — append 9 new exported helper functions (Plan 20-01)
- **MODIFY** `prisma/schema.prisma` — add `returnReminderSentAt DateTime?` to Rental model (Plan 20-03)
- **MODIFY** `src/features/wardrobe/api/queries/consignerQueries.ts` — add createNotification + sendConsignerDressSubmittedEmail to `create` (line 155) and `resubmit` (line 236); requires fetching admin user IDs/emails inside both mutations (Plan 20-02; NOTIFY-01)
- **MODIFY** `src/features/admin/api/queries/wardrobeDressQueries.ts` — extend `findUnique` selects at lines 309-318 (approveDress) and 379-380 (rejectDress) to include `Owner.email`; add email send beside line 358 (approve) and line 406 (reject) (Plan 20-02; NOTIFY-02, NOTIFY-03)
- **MODIFY** `src/features/wardrobe/api/queries/requestQueries.ts` — extend `findUnique` select at lines 157-160 (`create`) to fetch `Owner.{email,name}`; add email send beside line 240 (Plan 20-02; NOTIFY-04)
- **MODIFY** `src/features/admin/api/queries/wardrobeRequestQueries.ts` — extend selects at lines 190-191 (respondToRequest), 302 (markPaymentReceived), 528 (releaseDeposit), 638 (markConsignmentPaidOut) to include recipient email; add email send beside lines 261, 372, 571, 682 (Plan 20-02; NOTIFY-05, NOTIFY-06, NOTIFY-08, NOTIFY-09)

### NOT modified (intentionally)
- `src/lib/batch-email-sender.ts` — existing cron stays untouched
- `src/app/api/cron/send-batch-emails/route.ts` — existing cron stays untouched
- `src/features/notifications/utils/notificationHelpers.ts` — `createNotification` + `createNotificationForMultipleUsers` already provide everything needed
- All Phase 21 test files — DEFERRED to Phase 21 (TEST-01..08)

---

## Sources

### Primary (HIGH confidence — direct file reads in this repo)
- `src/lib/email.ts` (full file, 672 lines) — all template patterns, brand snippets, helper signatures
- `src/lib/batch-email-sender.ts` (114 lines) — cron loop pattern
- `src/app/api/cron/send-batch-emails/route.ts` (72 lines) — cron route pattern
- `src/features/notifications/utils/notificationHelpers.ts` (114 lines) — createNotification + createNotificationForMultipleUsers signatures
- `src/features/admin/api/queries/wardrobeRequestQueries.ts` (687 lines) — Phase 17 mutation insertion points
- `src/features/admin/api/queries/wardrobeDressQueries.ts` (411 lines) — Phase 18 admin approve/reject insertion points
- `src/features/wardrobe/api/queries/consignerQueries.ts` (429 lines) — Phase 18 consigner submission insertion points (NOTIFY-01 gap)
- `src/features/wardrobe/api/queries/requestQueries.ts` (402 lines) — Phase 16 rental request insertion point (NOTIFY-04)
- `src/features/admin/api/queries/wardrobeSettingsQueries.ts` — `wardrobeReturnReminderDays` setting access pattern
- `src/features/student/api/queries/bookingQueries.ts` (lines 395-440) — admin fan-out notification pattern reference
- `src/app/api/auth/signup/route.ts` (lines 240-280) — Promise.allSettled best-effort email pattern reference
- `prisma/schema.prisma` (Notification model, PendingEmailNotification model, Rental model, PaymentMethod enum)
- `__tests__/lib/admin-signup-notification.test.ts` — email helper test pattern (deferred to Phase 21)
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — phase context

### No secondary sources required
All findings sourced from direct repo reads. No WebSearch / Context7 / WebFetch calls necessary — the existing codebase fully prescribes the patterns.

---

## Metadata

**Confidence breakdown:**
- Standard stack (Resend + Next.js cron + Prisma): HIGH — all established, in production, no version uncertainty
- Architecture (helper signatures, try/catch pattern, fan-out vs single-target): HIGH — explicit prior-art for every choice
- Pitfalls (Resend outage handling, schedule conflicts, brand-sweep regression risk): HIGH — pulled from incident history in STATE.md and code comments

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (30 days — Resend SDK and Next.js are stable; revalidate if pnpm install bumps major versions of either)

// tests/helpers/wardrobe-test-utils.ts
//
// Wardrobe-specific E2E test helpers. Kept separate from tests/helpers/test-utils.ts
// to avoid bloating the project-wide util shared by all 22 existing specs.
//
// Includes:
//   - assertTrpcForbidden: canonical PERM-04 helper that POSTs a synthetic batched
//     TRPC request and asserts the response body is the TRPC error envelope with
//     httpStatus=403 (or that the HTTP layer 401-redirected before TRPC even ran).
//   - SEED_DRESS_TITLES: stable references to titles seeded by scripts/seed-wardrobe.ts.
//     If the seed changes, update these constants — they are the test surface's
//     contract with the seed data.
//   - expectNotificationContaining: Notification-row proxy for email-firing assertions
//     (see 21-RESEARCH §Q12 — wardrobe mutations swallow Resend errors in try/catch).

import { expect, type Page } from "@playwright/test";

/**
 * Stable titles from scripts/seed-wardrobe.ts (Plan 21-01).
 * Used by tests to navigate to known-good fixtures via text content.
 */
export const SEED_DRESS_TITLES = {
  YURA_CLASSICAL: "Midnight Crystal Classical",
  CONSIGNED_CLASSICAL: "Emerald Waltz Classical",
  CONSIGNED_DRAMATIC: "Crimson Tango Dramatic",
  YURA_THEMED: "Constellation Themed",
  YURA_ICE_DANCE_PARTNER: "Aurora Ice Dance Partner",
  CONSIGNED_ICE_DANCE_SINGLE: "Solo Spotlight Ice Dance",
} as const;

/**
 * Asserts that calling the given TRPC procedure via direct HTTP POST returns a
 * forbidden response. Handles two valid forbidden shapes:
 *   1. HTTP 401/403 (middleware redirected before TRPC ran, or TRPC layer rejected
 *      at the HTTP boundary).
 *   2. HTTP 200 + TRPC error envelope with data.httpStatus === 403 — the canonical
 *      TRPC-procedure-level rejection. Response body shape (batched):
 *      [{ error: { json: { message, code, data: { code, httpStatus, path } } } }]
 *
 * The test accepts EITHER as a passing assertion (both represent successful auth
 * gating).
 *
 * Usage:
 *   await assertTrpcForbidden(page, "admin.wardrobeRequest.respondToRequest",
 *     { requestId: "fake-cuid", decision: "APPROVE", responseMessage: "ok" });
 */
export async function assertTrpcForbidden(
  page: Page,
  procedurePath: string,
  input: unknown,
): Promise<void> {
  const url = `/api/trpc/${procedurePath}?batch=1`;
  // Batched TRPC v11 request body shape: { "0": { json: input } }
  const body = { "0": { json: input } };

  const response = await page.request.post(url, {
    data: body,
    headers: { "Content-Type": "application/json" },
    failOnStatusCode: false, // we expect 401, 403, or 200-with-error
  });

  const status = response.status();

  // Path 1: HTTP-layer 401/403 (middleware / proxy gate)
  if (status === 401 || status === 403) {
    return; // passing assertion
  }

  // Path 2: HTTP 200 with TRPC error envelope
  expect(status, `expected 401, 403, or 200 (with TRPC error), got ${status}`).toBe(200);
  const json = await response.json();
  // Batched response: array of [{ error: ... }] or [{ result: ... }] per call
  const first = Array.isArray(json) ? json[0] : json;
  const httpStatus = first?.error?.json?.data?.httpStatus ?? first?.error?.data?.httpStatus;
  expect(
    httpStatus,
    `expected TRPC error.data.httpStatus=403, got body=${JSON.stringify(first)}`,
  ).toBe(403);
}

/**
 * Polls /notifications for a notification matching the given title substring
 * within a timeout. Used to verify in-app notification fired (proxy for "the email
 * triggering code path executed" — see 21-RESEARCH §Q12).
 *
 * Naive but effective: navigates to /notifications, looks for matching text.
 * Throws if not found within timeout.
 */
export async function expectNotificationContaining(
  page: Page,
  titleSubstring: string,
  timeoutMs = 10000,
): Promise<void> {
  await page.goto("/notifications");
  await expect(page.getByText(titleSubstring, { exact: false }).first()).toBeVisible({
    timeout: timeoutMs,
  });
}

import { expect, test } from "@playwright/test";

// Story IDs to screenshot — covers all story files for visual regression
const stories = [
  // UI Primitives
  "ui-button--all-variants",
  "ui-button--all-sizes",
  "ui-card--default",
  "ui-card--kpi-card",
  "ui-badge--all-variants",
  "ui-badge--lesson-types",
  "ui-skeleton--card-skeleton",
  // Admin Dashboard
  "admin-dashboard-smartkpicards--default",
  "admin-dashboard-todaytimeline--with-lessons",
  "admin-dashboard-quickactions--default",
  "admin-dashboard-activityfeed--default",
  // Admin Analytics
  "admin-analytics-revenuechart--default",
  "admin-analytics-studentactivitychart--default",
  "admin-analytics-revenuebreakdownchart--default",
  // Coach Dashboard
  "coach-dashboard-coachoverviewcards--default",
  "coach-dashboard-coachupcominglessons--default",
  "coach-dashboard-coachpastlessons--default",
  // Student Dashboard
  "student-dashboard-upcominglessons--default",
  "student-dashboard-studentprogress--default",
  // Calendar Events
  "scheduling-fceventcontent--private-lesson",
  // Wardrobe (Phase 21 — STORY-01/02/03)
  "wardrobe-catalog-dresscard--default",
  "wardrobe-catalog-dresscard--with-best-fit-score",
  "wardrobe-catalog-wardrobefilterbar--default",
  "wardrobe-catalog-cataloggrid--populated",
  "wardrobe-catalog-cataloggrid--empty",
  "wardrobe-measurementform--prefilled",
  "wardrobe-detail-dressdetailhero--default",
  "wardrobe-detail-fitcheckcard--all-green",
  "wardrobe-request-rentalstatusbadge--pending",
  "wardrobe-request-rentalstatusbadge--approved",
  "wardrobe-request-requestrentaldialog--open",
  "wardrobe-admin-pendingapprovalqueue--default",
  "wardrobe-consigner-consignerearningstable--default",
  // ── Phase 22 Backfill (STORY-05 — 12 high-leverage components) ──────────────
  // UI Primitives (Tier 1)
  "ui-dialog--default",
  "ui-dialog--with-long-content",
  "ui-select--default",
  "ui-table--default",
  "ui-table--empty",
  "ui-tabs--default",
  "ui-form--default",
  // Wardrobe Widgets (Tier 2)
  "wardrobe-dressstatusbadge--available",
  "wardrobe-dressstatusbadge--rented",
  "wardrobe-bestfitbadge--high-fit",
  "wardrobe-detail-dressimagecarousel--multiple-images",
  // Dashboard/Notification Widgets (Tier 3)
  "student-dashboard-nextlessonhero--upcoming-lesson",
  "student-dashboard-outstandingpayments--default",
  "coach-earnings-earningsoverview--default",
  "notifications-notificationspopover--with-unread",
];

for (const storyId of stories) {
  test(`VRT: ${storyId}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${storyId}&viewMode=story`);
    // Wait for story to render
    await page.waitForLoadState("networkidle");
    // Extra wait for animations/charts
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`${storyId}.png`);
  });
}

import { test, expect } from "@playwright/test";

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

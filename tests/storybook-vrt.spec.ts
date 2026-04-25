import { test, expect } from "@playwright/test";

// Story IDs to screenshot — add more as you create stories
const stories = [
  "ui-button--all-variants",
  "ui-button--all-sizes",
  "ui-card--default",
  "ui-card--kpi-card",
  "ui-badge--all-variants",
  "ui-badge--lesson-types",
  "ui-skeleton--card-skeleton",
  "admin-dashboard-smartkpicards--default",
  "admin-dashboard-todaytimeline--with-lessons",
  "admin-analytics-revenuechart--default",
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

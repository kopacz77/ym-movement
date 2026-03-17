import { expect, test } from "@playwright/test";

// This is a debug utility, not a production test.
// It was used to reproduce React Error #130 in the student dashboard.
// The underlying issue has been fixed -- see CLAUDE.md "React Error #130 Production Resolution".

test.describe("Student Dashboard Error Debug", () => {
  test.fixme("reproduce student dashboard error", async ({ page }) => {
    // FIXME: Debug utility -- not a production test. The underlying React Error #130
    // has been fixed. This test is retained for historical reference only.
    await page.goto("/student/dashboard");
  });
});

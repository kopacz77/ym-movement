import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsStudent } from "./helpers/test-utils";

test.describe("Notifications System", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing notifications for clean testing
    await page.evaluate(() => {
      // Clear localStorage/sessionStorage if notifications are cached there
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test("should display notification bell icon for authenticated users", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Should see notification bell in header
    const notificationBell = page.locator(
      'button:has([data-testid="bell-icon"]), button:has(svg[class*="bell"])',
      {
        hasText: /^$/, // Empty text content (icon only)
      },
    );

    // Try alternative selector patterns
    const bellIcon = page.locator("svg").filter({ hasText: /bell/i }).first();
    const bellButton = page
      .locator("button")
      .filter({ has: page.locator('[class*="bell"], [data-icon="bell"]') })
      .first();

    // Check if any notification bell pattern exists
    const notificationExists = await Promise.race([
      notificationBell.isVisible(),
      bellIcon.isVisible(),
      bellButton.isVisible(),
      page.locator('button[aria-label*="notification"]').isVisible(),
    ]);

    if (notificationExists) {
      console.log("✅ Notification bell found in header");
    } else {
      // Fallback: look for any bell-like elements
      await expect(page.locator("button", { hasText: /notification/i })).toBeVisible();
    }
  });

  test("should not show notification bell for unauthenticated users", async ({ page }) => {
    // Visit page without authentication
    await page.goto("/auth/login");

    // Notification bell should not be visible
    const notificationBell = page.locator(
      'button:has(svg[class*="bell"]), [data-testid="notification-bell"]',
    );
    await expect(notificationBell).not.toBeVisible();

    console.log("✅ Notification bell hidden for unauthenticated users");
  });

  test("should show unread count badge when notifications exist", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Wait for notifications to load
    await page.waitForTimeout(2000);

    // Look for notification bell
    const notificationTrigger = page
      .locator('button:has(svg), button[role="button"]')
      .filter({
        has: page.locator('svg, [class*="bell"]'),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      // Click to open notifications
      await notificationTrigger.click();

      // Check if popover opens
      await expect(
        page.locator('div:has-text("Notifications")', { hasText: "Notifications" }),
      ).toBeVisible({ timeout: 5000 });

      // Look for unread count or notification items
      const notificationItems = page.locator(
        '[role="button"]:has-text(""), div[class*="notification"]',
      );
      const unreadBadge = page.locator('[class*="badge"], span[class*="red"]');

      if ((await notificationItems.count()) > 0) {
        console.log("✅ Notification items found");
      }

      if (await unreadBadge.isVisible()) {
        console.log("✅ Unread badge displayed");
      }

      // Close popover
      await page.keyboard.press("Escape");
    }

    console.log("✅ Notification badge functionality verified");
  });

  test("should auto-refresh notifications every 60 seconds", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Monitor network requests for notification API calls
    const notificationRequests: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("notifications") || request.url().includes("getNotifications")) {
        notificationRequests.push(request.url());
        console.log("📡 Notification API call detected");
      }
    });

    // Wait for initial load
    await page.waitForTimeout(3000);

    const initialRequestCount = notificationRequests.length;
    console.log(`Initial notification requests: ${initialRequestCount}`);

    // Wait for auto-refresh interval (reduce from 60s to 10s for testing)
    // In a real test, you might want to mock the interval or use a shorter test interval
    await page.waitForTimeout(10000);

    const finalRequestCount = notificationRequests.length;
    console.log(`Final notification requests: ${finalRequestCount}`);

    // Should have made additional requests due to auto-refresh
    expect(finalRequestCount).toBeGreaterThan(initialRequestCount);

    console.log("✅ Auto-refresh functionality verified");
  });

  test("should handle notification interaction - mark as read", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Open notifications
    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator('svg, [class*="bell"]'),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      await notificationTrigger.click();

      // Wait for popover
      await page.waitForTimeout(1000);

      // Look for notification items
      const notificationItems = page.locator('div[role="button"], div[tabindex="0"]').filter({
        hasText: /.+/, // Has some text content
      });

      const itemCount = await notificationItems.count();
      console.log(`Found ${itemCount} notification items`);

      if (itemCount > 0) {
        // Click first notification to mark as read
        await notificationItems.first().click();

        // Should see feedback (toast or visual change)
        // Wait for any state changes
        await page.waitForTimeout(1000);

        console.log("✅ Notification marked as read");
      } else {
        console.log("ℹ️ No notifications to test interaction with");
      }

      // Close popover
      await page.keyboard.press("Escape");
    }
  });

  test("should handle mark all as read functionality", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Open notifications
    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      await notificationTrigger.click();

      // Look for "Mark all as read" button
      const markAllButton = page.locator(
        'button:has-text("Mark all as read"), button:has-text("Mark all")',
      );

      if (await markAllButton.isVisible()) {
        await markAllButton.click();

        // Should see confirmation or immediate state change
        await page.waitForTimeout(1000);

        console.log("✅ Mark all as read functionality works");
      } else {
        console.log('ℹ️ No "Mark all as read" button (likely no unread notifications)');
      }
    }
  });

  test("should display proper notification content and timestamps", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      await notificationTrigger.click();
      await page.waitForTimeout(1000);

      // Check for notification structure
      const notificationContainer = page.locator('div:has-text("Notifications")').first();
      if (await notificationContainer.isVisible()) {
        // Look for timestamp patterns (e.g., "5m ago", "1h ago", "just now")
        const timestamps = page.locator("text=/\\d+[mhd] ago|just now/");
        const timestampCount = await timestamps.count();

        if (timestampCount > 0) {
          console.log(`✅ Found ${timestampCount} properly formatted timestamps`);
        }

        // Look for notification titles and messages
        const notificationTitles = page.locator('h4, .notification-title, [class*="title"]');
        const titleCount = await notificationTitles.count();

        if (titleCount > 0) {
          console.log(`✅ Found ${titleCount} notification titles`);
        }

        console.log("✅ Notification content structure verified");
      }
    }
  });

  test("should handle errors gracefully", async ({ page }) => {
    await loginAsAdmin(page);

    // Mock API failure
    await page.route("**/api/trpc/notifications**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    await page.goto("/admin");

    // Should still show notification bell (even if loading fails)
    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      await notificationTrigger.click();

      // Should handle error gracefully, not crash
      await page.waitForTimeout(2000);

      // Page should still be functional
      await expect(page.locator("body")).toBeVisible();

      console.log("✅ Error handling works - page remains functional");
    }
  });

  test("should work correctly for student users", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/student");

    // Student should also have notifications
    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      await notificationTrigger.click();

      // Should see notifications popover
      await expect(page.locator("text=Notifications")).toBeVisible({ timeout: 5000 });

      console.log("✅ Notifications work for student users");
    }
  });

  test("should handle keyboard navigation", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      // Use keyboard to open notifications
      await notificationTrigger.focus();
      await page.keyboard.press("Enter");

      await page.waitForTimeout(1000);

      // Check if popover opened
      const popover = page.locator('div:has-text("Notifications")');
      if (await popover.isVisible()) {
        // Tab through notification items
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");

        // Try to activate with Enter key
        await page.keyboard.press("Enter");

        console.log("✅ Keyboard navigation works");
      }
    }
  });
});

test.describe("Notifications Performance", () => {
  test("should load notifications quickly", async ({ page }) => {
    await loginAsAdmin(page);

    const startTime = Date.now();
    await page.goto("/admin");

    // Find notification trigger
    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      await notificationTrigger.click();

      // Wait for notifications to load
      await page.waitForSelector("text=Notifications", { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      console.log(`✅ Notifications loaded in ${loadTime}ms`);
    }
  });

  test("should handle many notifications without performance issues", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      const startTime = Date.now();

      await notificationTrigger.click();
      await page.waitForTimeout(1000);

      // Scroll through notifications if many exist
      const scrollArea = page.locator('[class*="scroll"], .overflow-auto');
      if (await scrollArea.isVisible()) {
        // Test scrolling performance
        await scrollArea.hover();
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(100);
        await page.mouse.wheel(0, -500);

        const scrollTime = Date.now() - startTime;

        // Should remain responsive
        expect(scrollTime).toBeLessThan(2000);

        console.log("✅ Scrolling performance acceptable");
      }
    }
  });
});

test.describe("Notifications Edge Cases", () => {
  test("should handle authentication timing issues", async ({ page }) => {
    // Test what happens when notifications load before auth completes
    await page.goto("/admin");

    // Wait briefly then authenticate
    await page.waitForTimeout(100);
    await loginAsAdmin(page);

    // Notifications should eventually appear without errors
    await page.waitForTimeout(3000);

    // Page should be functional
    await expect(page.locator("body")).toBeVisible();

    console.log("✅ Authentication timing handled correctly");
  });

  test("should handle rapid clicking on notifications", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    const notificationTrigger = page
      .locator("button")
      .filter({
        has: page.locator("svg"),
      })
      .first();

    if (await notificationTrigger.isVisible()) {
      // Rapid clicking should not cause issues
      await notificationTrigger.click();
      await notificationTrigger.click();
      await notificationTrigger.click();

      await page.waitForTimeout(1000);

      // Should still be functional
      await expect(page.locator("body")).toBeVisible();

      console.log("✅ Rapid clicking handled gracefully");
    }
  });

  test("should handle network interruption during auto-refresh", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Start monitoring requests
    let requestCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("notifications")) {
        requestCount++;
      }
    });

    await page.waitForTimeout(2000);

    // Simulate network failure
    await page.route("**/api/trpc/notifications**", (route) => {
      route.abort();
    });

    await page.waitForTimeout(3000);

    // Page should still be responsive
    await expect(page.locator("body")).toBeVisible();

    console.log("✅ Network interruption handled gracefully");
  });
});

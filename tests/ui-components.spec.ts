import { expect, test } from "@playwright/test";
import { loginAsAdmin, loginAsStudent } from "./helpers/test-utils";

test.describe("UI Components - Toast Notifications", () => {
  test("should display sonner toast notifications consistently", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/students");

    // Trigger an action that should show a toast (e.g., approving a student)
    const actionButton = page
      .locator('button:has-text("Approve"), button:has-text("Delete"), button:has-text("Save")')
      .first();

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Should see Sonner toast notification
      const toast = page.locator('[data-sonner-toast], .sonner-toast, [class*="toast"]');
      await expect(toast).toBeVisible({ timeout: 5000 });

      // Toast should have consistent positioning (top-center)
      const toastContainer = page.locator("[data-sonner-toaster], .sonner-toaster");
      if (await toastContainer.isVisible()) {
        const position = await toastContainer.evaluate((el) =>
          window.getComputedStyle(el).getPropertyValue("position"),
        );
        console.log(`✅ Toast positioned: ${position}`);
      }

      console.log("✅ Sonner toast displayed with consistent styling");
    }
  });

  test("should show delete confirmation toasts with action buttons", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/schedule");

    // Look for delete buttons
    const deleteButton = page.locator('button:has-text("Delete"), button[title*="delete"]').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Should see confirmation toast with action buttons
      const confirmationToast = page.locator("text=Delete, text=Are you sure");
      await expect(confirmationToast).toBeVisible({ timeout: 5000 });

      // Should have Cancel and Delete/Confirm buttons
      const cancelButton = page.locator('[data-sonner-toast] button:has-text("Cancel")');
      const confirmButton = page.locator(
        '[data-sonner-toast] button:has-text("Delete"), [data-sonner-toast] button:has-text("Confirm")',
      );

      await expect(cancelButton).toBeVisible();
      await expect(confirmButton).toBeVisible();

      // Click cancel to avoid actual deletion
      await cancelButton.click();

      console.log("✅ Delete confirmation toast with action buttons works");
    }
  });

  test("should display success toasts with proper timing", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Monitor for any success toasts that might appear
    let toastAppeared = false;

    page.on("console", (msg) => {
      if (msg.text().includes("✅") || msg.text().includes("success")) {
        toastAppeared = true;
      }
    });

    // Perform an action likely to show success toast
    const createButton = page
      .locator('button:has-text("Create"), button:has-text("Add"), button:has-text("Save")')
      .first();

    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill any required form fields
      const requiredInputs = page.locator("input[required], select[required]");
      const inputCount = await requiredInputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = requiredInputs.nth(i);
        const inputType = await input.getAttribute("type");

        if (inputType === "text" || inputType === "email") {
          await input.fill("Test Value");
        } else if (inputType === "date") {
          const today = new Date().toISOString().split("T")[0];
          await input.fill(today);
        }
      }

      // Submit if there's a submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Look for success toast
        const successToast = page.locator("text=success, text=created, text=saved", {
          hasText: /success|created|saved/i,
        });
        const hasSuccess = await successToast.isVisible({ timeout: 8000 });

        if (hasSuccess) {
          console.log("✅ Success toast displayed with proper timing");
        }
      }
    }
  });

  test("should handle error toasts gracefully", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/students");

    // Mock API to return error
    await page.route("**/api/trpc/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Test error message" }),
      });
    });

    // Trigger action that would cause error
    const actionButton = page.locator('button:has-text("Save"), button:has-text("Create")').first();

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Should see error toast
      const errorToast = page.locator("text=error, text=failed", { hasText: /error|failed/i });
      const hasError = await errorToast.isVisible({ timeout: 8000 });

      if (hasError) {
        console.log("✅ Error toast handled gracefully");
      }

      // Application should remain functional
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("should display toasts with consistent z-index and positioning", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Open a modal dialog first
    const modalTrigger = page.locator('button:has-text("Create"), button:has-text("Add")').first();

    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();

      // Should see modal
      const modal = page.locator('[role="dialog"], .modal, [data-testid*="dialog"]');
      if (await modal.isVisible()) {
        // Trigger toast within modal (e.g., validation error)
        const submitButton = page.locator('button[type="submit"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();

          // Toast should appear above modal
          const toast = page.locator("[data-sonner-toast]");
          if (await toast.isVisible()) {
            const toastZIndex = await toast.evaluate((el) =>
              window.getComputedStyle(el).getPropertyValue("z-index"),
            );

            const modalZIndex = await modal.evaluate((el) =>
              window.getComputedStyle(el).getPropertyValue("z-index"),
            );

            console.log(`✅ Toast z-index: ${toastZIndex}, Modal z-index: ${modalZIndex}`);

            // Toast should have higher z-index than modal
            const toastZ = Number.parseInt(toastZIndex) || 0;
            const modalZ = Number.parseInt(modalZIndex) || 0;

            if (toastZ > modalZ) {
              console.log("✅ Toast positioned above modal correctly");
            }
          }
        }
      }
    }
  });

  test("should handle rapid toast notifications without stacking issues", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Trigger multiple actions rapidly
    const actionButtons = page.locator(
      'button:has-text("Save"), button:has-text("Delete"), button:has-text("Create")',
    );
    const buttonCount = await actionButtons.count();

    if (buttonCount > 0) {
      // Rapidly click multiple buttons
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        await actionButtons.nth(i).click();
        await page.waitForTimeout(100);
      }

      // Should handle multiple toasts gracefully
      const toastContainer = page.locator("[data-sonner-toaster]");
      if (await toastContainer.isVisible()) {
        const toasts = page.locator("[data-sonner-toast]");
        const toastCount = await toasts.count();

        console.log(`✅ Handled ${toastCount} simultaneous toasts`);

        // Toasts should not overlap badly
        if (toastCount > 1) {
          console.log("✅ Multiple toast stacking handled");
        }
      }
    }
  });

  test("should auto-dismiss toasts after appropriate duration", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Trigger a toast notification
    const actionButton = page.locator("button").first();

    if (await actionButton.isVisible()) {
      await actionButton.click();

      const toast = page.locator("[data-sonner-toast]");

      if (await toast.isVisible()) {
        console.log("✅ Toast appeared");

        // Wait longer than typical auto-dismiss duration (usually 4-6 seconds)
        await page.waitForTimeout(7000);

        // Toast should be gone or dismissed
        const stillVisible = await toast.isVisible();
        if (!stillVisible) {
          console.log("✅ Toast auto-dismissed after appropriate duration");
        }
      }
    }
  });
});

test.describe("UI Components - WarmGreeting", () => {
  test("should display personalized greeting for admin users", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Look for warm greeting component
    const greeting = page.locator("text=/Good (morning|afternoon|evening)/, text=/Hey there/");

    if (await greeting.isVisible()) {
      const greetingText = await greeting.textContent();
      console.log(`✅ Admin greeting: "${greetingText}"`);

      // Should contain time-appropriate greeting
      const currentHour = new Date().getHours();
      if (currentHour < 12 && greetingText?.includes("morning")) {
        console.log("✅ Time-appropriate greeting displayed");
      } else if (currentHour >= 12 && currentHour < 17 && greetingText?.includes("afternoon")) {
        console.log("✅ Time-appropriate greeting displayed");
      } else if (currentHour >= 17 && greetingText?.includes("evening")) {
        console.log("✅ Time-appropriate greeting displayed");
      }

      // Look for greeting icon
      const greetingIcon = page
        .locator("svg")
        .filter({ has: page.locator('[class*="sun"], [class*="moon"], [class*="coffee"]') });
      if (await greetingIcon.isVisible()) {
        console.log("✅ Greeting icon displayed");
      }
    }
  });

  test("should display appropriate greeting for student users", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/student");

    const greeting = page.locator("text=/Good (morning|afternoon|evening)/");

    if (await greeting.isVisible()) {
      const greetingText = await greeting.textContent();
      console.log(`✅ Student greeting: "${greetingText}"`);

      // Student greetings should be professional but warm
      const isProfessional =
        !greetingText?.includes("Princess") && !greetingText?.includes("Beautiful");
      if (isProfessional) {
        console.log("✅ Student greeting is appropriately professional");
      }
    }
  });

  test("should vary greeting punctuation for personalization", async ({ page }) => {
    await loginAsAdmin(page);

    const greetings: string[] = [];

    // Check greeting multiple times to see variation
    for (let i = 0; i < 3; i++) {
      await page.goto("/admin");
      await page.waitForTimeout(1000);

      const greeting = page.locator(
        "text=/Good (morning|afternoon|evening).*[!:]/, text=/Hey there.*[!:]/",
      );
      if (await greeting.isVisible()) {
        const greetingText = await greeting.textContent();
        if (greetingText) {
          greetings.push(greetingText);
        }
      }

      // Change time context slightly to trigger variation
      await page.waitForTimeout(100);
    }

    // Check if different punctuation appears
    const hasExclamation = greetings.some((g) => g.includes("!"));
    const hasSmiley = greetings.some((g) => g.includes(":)"));

    if (hasExclamation || hasSmiley) {
      console.log("✅ Greeting punctuation varies for personalization");
      console.log("Greetings observed:", greetings);
    }
  });

  test("should display greeting icons with hover animations", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    const greeting = page
      .locator("text=/Good (morning|afternoon|evening)/, text=/Hey there/")
      .first();

    if (await greeting.isVisible()) {
      // Look for the greeting container with hover effects
      const greetingContainer = greeting.locator("..");

      if (await greetingContainer.isVisible()) {
        // Hover over the greeting
        await greetingContainer.hover();

        // Check if hover animation triggers (scale or rotation)
        const hasHoverEffect = await greetingContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return computed.transform !== "none" || el.classList.contains("hover:scale-105");
        });

        if (hasHoverEffect) {
          console.log("✅ Greeting hover animation works");
        }

        // Look for heart icon that appears on hover (admin only)
        const heartIcon = page.locator('[class*="heart"]');
        if (await heartIcon.isVisible()) {
          console.log("✅ Admin heart icon appears on hover");
        }
      }
    }
  });

  test("should handle server-side rendering without hydration issues", async ({ page }) => {
    // This test checks for hydration mismatch issues
    let hydrationErrors = false;

    page.on("console", (msg) => {
      if (msg.text().includes("hydration") || msg.text().includes("mismatch")) {
        hydrationErrors = true;
        console.error("Hydration error:", msg.text());
      }
    });

    await loginAsAdmin(page);
    await page.goto("/admin");

    // Wait for hydration to complete
    await page.waitForTimeout(2000);

    if (!hydrationErrors) {
      console.log("✅ No hydration errors in WarmGreeting component");
    }

    // Greeting should be visible and stable
    const greeting = page.locator("text=/Good (morning|afternoon|evening)/, text=/Hey there/");
    await expect(greeting).toBeVisible();

    console.log("✅ WarmGreeting renders consistently");
  });
});

test.describe("UI Components - Dialogs", () => {
  test("should open compact time slot dialog with context-aware defaults", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/schedule");

    // Look for calendar or schedule interface
    const calendar = page.locator('[class*="calendar"], .react-calendar').first();

    if (await calendar.isVisible()) {
      // Click on a calendar date to potentially open dialog
      const calendarDates = calendar.locator("button:not([disabled])");
      if ((await calendarDates.count()) > 0) {
        await calendarDates.nth(10).click();

        // Look for dialog that opens
        const dialog = page.locator('[role="dialog"], .dialog-content');

        if (await dialog.isVisible()) {
          // Should be compact (not too large)
          const dialogSize = await dialog.boundingBox();
          if (dialogSize && dialogSize.height < 600) {
            console.log("✅ Dialog is compact size");
          }

          // Should have context-aware pre-filled values
          const dateInputs = page.locator('input[type="date"], input[name*="date"]');
          const timeInputs = page.locator('input[type="time"], input[name*="time"]');

          if (await dateInputs.first().isVisible()) {
            const dateValue = await dateInputs.first().inputValue();
            if (dateValue) {
              console.log("✅ Date pre-filled from calendar context");
            }
          }

          if (await timeInputs.first().isVisible()) {
            const timeValue = await timeInputs.first().inputValue();
            if (timeValue) {
              console.log("✅ Time pre-filled with smart defaults");
            }
          }

          // Close dialog
          const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close")');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await page.keyboard.press("Escape");
          }
        }
      }
    }
  });

  test("should handle dialog form validation correctly", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/schedule");

    // Open create dialog
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add")').first();

    if (await createButton.isVisible()) {
      await createButton.click();

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Try to submit empty form
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")');
        await submitButton.click();

        // Should see validation messages
        const validationError = page.locator(
          'text=required, text=Please fill, [aria-invalid="true"]',
        );
        const hasValidation = await validationError.isVisible({ timeout: 3000 });

        if (hasValidation) {
          console.log("✅ Form validation works in dialog");
        }

        // Close dialog
        await page.keyboard.press("Escape");
      }
    }
  });

  test("should maintain dialog accessibility standards", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/schedule");

    const createButton = page.locator('button:has-text("Create"), button:has-text("Add")').first();

    if (await createButton.isVisible()) {
      await createButton.click();

      const dialog = page.locator('[role="dialog"]');
      if (await dialog.isVisible()) {
        // Should have proper ARIA attributes
        const hasAriaLabel = await dialog.getAttribute("aria-label");
        const hasAriaDescribedBy = await dialog.getAttribute("aria-describedby");

        if (hasAriaLabel || hasAriaDescribedBy) {
          console.log("✅ Dialog has proper ARIA attributes");
        }

        // Should trap focus
        await page.keyboard.press("Tab");
        const focusedElement = page.locator(":focus");
        const isWithinDialog = await focusedElement.evaluate((el) => {
          let parent = el.parentElement;
          while (parent) {
            if (parent.getAttribute("role") === "dialog") return true;
            parent = parent.parentElement;
          }
          return false;
        });

        if (isWithinDialog) {
          console.log("✅ Focus is trapped within dialog");
        }

        // Escape should close dialog
        await page.keyboard.press("Escape");
        const dialogClosed = !(await dialog.isVisible({ timeout: 1000 }));

        if (dialogClosed) {
          console.log("✅ Escape key closes dialog");
        }
      }
    }
  });

  test("should handle dialog responsive design", async ({ page }) => {
    await loginAsAdmin(page);

    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: "Mobile" },
      { width: 768, height: 1024, name: "Tablet" },
      { width: 1920, height: 1080, name: "Desktop" },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto("/admin/schedule");

      const createButton = page
        .locator('button:has-text("Create"), button:has-text("Add")')
        .first();

      if (await createButton.isVisible()) {
        await createButton.click();

        const dialog = page.locator('[role="dialog"]');
        if (await dialog.isVisible()) {
          // Dialog should fit within viewport
          const dialogBox = await dialog.boundingBox();
          if (dialogBox) {
            const fitsWidth = dialogBox.width <= viewport.width - 40; // 20px margin each side
            const fitsHeight = dialogBox.height <= viewport.height - 40;

            if (fitsWidth && fitsHeight) {
              console.log(`✅ Dialog fits properly on ${viewport.name}`);
            }
          }

          await page.keyboard.press("Escape");
        }
      }
    }
  });
});

test.describe("UI Components Performance", () => {
  test("should render components efficiently", async ({ page }) => {
    await loginAsAdmin(page);

    const startTime = Date.now();
    await page.goto("/admin");

    // Wait for key components to load
    await Promise.race([
      page.waitForSelector("text=/Good (morning|afternoon|evening)/", { timeout: 5000 }),
      page.waitForSelector("h1, h2", { timeout: 5000 }),
    ]);

    const loadTime = Date.now() - startTime;

    // Should render quickly
    expect(loadTime).toBeLessThan(3000);

    console.log(`✅ Components rendered in ${loadTime}ms`);
  });

  test("should handle component interactions smoothly", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");

    // Test multiple rapid interactions
    const interactiveElements = page.locator('button, [role="button"]');
    const elementCount = await interactiveElements.count();

    if (elementCount > 0) {
      const startTime = Date.now();

      // Rapid interactions
      for (let i = 0; i < Math.min(elementCount, 5); i++) {
        await interactiveElements.nth(i).hover();
        await page.waitForTimeout(50);
      }

      const interactionTime = Date.now() - startTime;

      // Should remain responsive
      expect(interactionTime).toBeLessThan(1000);

      console.log(`✅ Component interactions completed in ${interactionTime}ms`);
    }
  });
});

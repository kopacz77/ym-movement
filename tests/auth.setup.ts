import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPER_ADMIN_AUTH = path.join(__dirname, "../playwright/.auth/super-admin.json");
const COACH_AUTH = path.join(__dirname, "../playwright/.auth/coach.json");
const COACH2_AUTH = path.join(__dirname, "../playwright/.auth/coach2.json");
const STUDENT_AUTH = path.join(__dirname, "../playwright/.auth/student.json");

// Run setup steps serially to avoid overwhelming the dev server during cold compilation
setup.describe.configure({ mode: "serial" });

// Increase timeout for auth setup -- dev server cold compilation can take 60s+
setup.setTimeout(90000);

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
  expectedUrl: string,
  storagePath: string,
) {
  await page.goto("/auth/login");
  await page.waitForLoadState("domcontentloaded");
  const emailInput = page.locator('input[id="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(email);
  await page.locator('input[id="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Allow 60s for first-time route compilation in dev server (cold start)
  await page.waitForURL(expectedUrl, { timeout: 60000 });
  await page.context().storageState({ path: storagePath });
}

setup("seed test data", async () => {
  execSync("npx tsx tests/helpers/seed-test-data.ts", { stdio: "inherit" });
});

setup("seed wardrobe data", async () => {
  execSync("npx tsx scripts/seed-wardrobe.ts", { stdio: "inherit" });
});

setup("authenticate as super admin", async ({ page }) => {
  await login(page, "admin@test.com", "ADMINPASS2025!", "/admin/dashboard", SUPER_ADMIN_AUTH);
});

setup("authenticate as coach", async ({ page }) => {
  await login(page, "coach@test.com", "COACHPASS2025!", "/coach/dashboard", COACH_AUTH);
});

setup("authenticate as coach2", async ({ page }) => {
  await login(page, "coach2@test.com", "COACH2PASS2025!", "/coach/dashboard", COACH2_AUTH);
});

setup("authenticate as student", async ({ page }) => {
  await login(
    page,
    "test.student@example.com",
    "TestPassword123!",
    "/student/dashboard",
    STUDENT_AUTH,
  );
});

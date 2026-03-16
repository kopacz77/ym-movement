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

setup("seed test data", async () => {
  execSync("npx tsx tests/helpers/seed-test-data.ts", { stdio: "inherit" });
});

setup("authenticate as super admin", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "admin@test.com");
  await page.fill('input[id="password"]', "ADMINPASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/admin/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: SUPER_ADMIN_AUTH });
});

setup("authenticate as coach", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "coach@test.com");
  await page.fill('input[id="password"]', "COACHPASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/coach/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: COACH_AUTH });
});

setup("authenticate as coach2", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "coach2@test.com");
  await page.fill('input[id="password"]', "COACH2PASS2025!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/coach/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: COACH2_AUTH });
});

setup("authenticate as student", async ({ page }) => {
  await page.goto("/auth/login");
  await page.fill('input[id="email"]', "test.student@example.com");
  await page.fill('input[id="password"]', "TestPassword123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("/student/dashboard", { timeout: 15000 });
  await page.context().storageState({ path: STUDENT_AUTH });
});

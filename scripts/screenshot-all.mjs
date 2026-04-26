import { chromium } from 'playwright';
import path from 'path';

const projectDir = '/home/kopacz/projects/ym-movement';
const outDir = path.join(projectDir, 'docs/comparison-screenshots');

async function login(browser, email, password, expectedUrl) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3100/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[id="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[id="email"]').fill(email);
  await page.locator('input[id="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(expectedUrl, { timeout: 30000 });
  await page.waitForTimeout(3000);
  return page;
}

async function run() {
  const browser = await chromium.launch();
  
  // Admin dashboard
  const adminPage = await login(browser, 'admin@test.com', 'ADMINPASS2025!', '**/admin/dashboard');
  await adminPage.screenshot({ path: path.join(outDir, 'app-admin-viewport.png'), fullPage: false });
  console.log('✅ app-admin-viewport.png');

  // Student dashboard
  const studentPage = await login(browser, 'test.student@example.com', 'TestPassword123!', '**/student/dashboard');
  await studentPage.screenshot({ path: path.join(outDir, 'app-student-viewport.png'), fullPage: false });
  console.log('✅ app-student-viewport.png');

  // Coach dashboard
  const coachPage = await login(browser, 'coach@test.com', 'COACHPASS2025!', '**/coach/dashboard');
  await coachPage.screenshot({ path: path.join(outDir, 'app-coach-viewport.png'), fullPage: false });
  console.log('✅ app-coach-viewport.png');

  await browser.close();
}

run().catch(console.error);

import { chromium } from 'playwright';
import path from 'path';

const projectDir = '/home/kopacz/projects/ym-movement';
const outDir = path.join(projectDir, 'docs/comparison-screenshots');

async function run() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  
  // Login as admin
  await page.goto('http://localhost:3100/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[id="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[id="email"]').fill('admin@test.com');
  await page.locator('input[id="password"]').fill('ADMINPASS2025!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Dashboard
  await page.screenshot({ path: path.join(outDir, 'page-dashboard.png'), fullPage: false });
  console.log('✅ dashboard');
  
  // Students
  await page.goto('http://localhost:3100/admin/students');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'page-students.png'), fullPage: false });
  console.log('✅ students');
  
  // Payments
  await page.goto('http://localhost:3100/admin/payments');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'page-payments.png'), fullPage: false });
  console.log('✅ payments');
  
  // Schedule
  await page.goto('http://localhost:3100/admin/schedule');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'page-schedule.png'), fullPage: false });
  console.log('✅ schedule');

  // Reports (has charts)
  await page.goto('http://localhost:3100/admin/reports');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'page-reports.png'), fullPage: false });
  console.log('✅ reports');

  // Scroll down to see the charts
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'page-reports-charts.png'), fullPage: false });
  console.log('✅ reports-charts');

  await browser.close();
}

run().catch(console.error);

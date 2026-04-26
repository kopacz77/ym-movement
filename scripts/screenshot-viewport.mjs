import { chromium } from 'playwright';
import path from 'path';

const projectDir = '/home/kopacz/projects/ym-movement';
const outDir = path.join(projectDir, 'docs/comparison-screenshots');

async function run() {
  const browser = await chromium.launch();
  
  // Stitch admin dashboard - viewport only
  const sp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await sp.goto(`file://${projectDir}/docs/stitch-designs/02-admin-dashboard.html`);
  await sp.waitForTimeout(1000);
  await sp.screenshot({ path: path.join(outDir, 'stitch-admin-viewport.png'), fullPage: false });
  console.log('✅ stitch-admin-viewport.png');
  await sp.close();

  // Live app admin dashboard - viewport only
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3100/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[id="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('input[id="email"]').fill('admin@test.com');
  await page.locator('input[id="password"]').fill('ADMINPASS2025!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'app-admin-viewport.png'), fullPage: false });
  console.log('✅ app-admin-viewport.png');

  await browser.close();
}

run().catch(console.error);

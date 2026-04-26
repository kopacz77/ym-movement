import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = '/home/kopacz/projects/ym-movement';
const outDir = path.join(projectDir, 'docs/comparison-screenshots');

async function run() {
  const browser = await chromium.launch();
  
  // ─── 1. Screenshot Stitch mockups ───
  console.log('📸 Screenshotting Stitch mockups...');
  const stitchPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const mockups = [
    { file: '02-admin-dashboard.html', name: 'admin-dashboard-stitch' },
    { file: '03-student-dashboard.html', name: 'student-dashboard-stitch' },
    { file: '04-coach-dashboard.html', name: 'coach-dashboard-stitch' },
  ];
  
  for (const m of mockups) {
    const filePath = path.join(projectDir, 'docs/stitch-designs', m.file);
    await stitchPage.goto(`file://${filePath}`);
    await stitchPage.waitForTimeout(1000);
    await stitchPage.screenshot({ 
      path: path.join(outDir, `${m.name}.png`), 
      fullPage: true 
    });
    console.log(`  ✅ ${m.name}.png`);
  }
  await stitchPage.close();

  // ─── 2. Login as admin and screenshot dashboard ───
  console.log('\n🔐 Logging in as admin...');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3100/auth/login');
  await page.waitForLoadState('domcontentloaded');
  
  const emailInput = page.locator('input[id="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await emailInput.fill('admin@test.com');
  await page.locator('input[id="password"]').fill('ADMINPASS2025!');
  await page.locator('button[type="submit"]').click();
  
  try {
    await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
    console.log('  ✅ Logged in successfully');
  } catch (e) {
    console.log('  ❌ Login failed, current URL:', page.url());
    await page.screenshot({ path: path.join(outDir, 'login-failed.png') });
    await browser.close();
    return;
  }
  
  // Wait for dashboard to fully load
  await page.waitForTimeout(3000);
  
  await page.screenshot({ 
    path: path.join(outDir, 'admin-dashboard-app.png'), 
    fullPage: true 
  });
  console.log('  ✅ admin-dashboard-app.png');

  // ─── 3. Login as student ───
  console.log('\n🔐 Logging in as student...');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await ctx2.newPage();
  
  await page2.goto('http://localhost:3100/auth/login');
  await page2.waitForLoadState('domcontentloaded');
  await page2.locator('input[id="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page2.locator('input[id="email"]').fill('test.student@example.com');
  await page2.locator('input[id="password"]').fill('TestPassword123!');
  await page2.locator('button[type="submit"]').click();
  
  try {
    await page2.waitForURL('**/student/dashboard', { timeout: 30000 });
    console.log('  ✅ Logged in successfully');
    await page2.waitForTimeout(3000);
    await page2.screenshot({ 
      path: path.join(outDir, 'student-dashboard-app.png'), 
      fullPage: true 
    });
    console.log('  ✅ student-dashboard-app.png');
  } catch (e) {
    console.log('  ❌ Student login failed, URL:', page2.url());
  }

  // ─── 4. Login as coach ───
  console.log('\n🔐 Logging in as coach...');
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page3 = await ctx3.newPage();
  
  await page3.goto('http://localhost:3100/auth/login');
  await page3.waitForLoadState('domcontentloaded');
  await page3.locator('input[id="email"]').waitFor({ state: 'visible', timeout: 15000 });
  await page3.locator('input[id="email"]').fill('coach@test.com');
  await page3.locator('input[id="password"]').fill('COACHPASS2025!');
  await page3.locator('button[type="submit"]').click();
  
  try {
    await page3.waitForURL('**/coach/dashboard', { timeout: 30000 });
    console.log('  ✅ Logged in successfully');
    await page3.waitForTimeout(3000);
    await page3.screenshot({ 
      path: path.join(outDir, 'coach-dashboard-app.png'), 
      fullPage: true 
    });
    console.log('  ✅ coach-dashboard-app.png');
  } catch (e) {
    console.log('  ❌ Coach login failed, URL:', page3.url());
  }

  await browser.close();
  console.log('\n✅ All screenshots saved to docs/comparison-screenshots/');
}

run().catch(console.error);

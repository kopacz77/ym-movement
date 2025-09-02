const { chromium } = require('playwright');

async function debugStudentDashboard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Console Error:', msg.text());
    }
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log('🔴 Page Error:', error.message);
    console.log('Stack:', error.stack);
  });

  try {
    console.log('🔍 Navigating to the app...');
    await page.goto('http://localhost:3000');
    
    console.log('📱 Taking screenshot of home page...');
    await page.screenshot({ path: 'debug-01-home.png' });

    // Try to login first
    console.log('🔑 Looking for auth elements...');
    
    // Check if we're already on a login page or need to navigate
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Look for sign in elements
    const signInButton = await page.locator('text=Sign In').first();
    if (await signInButton.isVisible()) {
      console.log('📝 Found Sign In button, clicking...');
      await signInButton.click();
      await page.waitForTimeout(2000);
    }

    // Check for email input
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    if (await emailInput.isVisible()) {
      console.log('📧 Found email input, entering credentials...');
      await emailInput.fill('student@test.com'); // Replace with actual student email
      
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill('ADMINPASS2025!'); // Using the password we created
      
      await page.screenshot({ path: 'debug-02-login-form.png' });
      
      // Submit login
      const loginButton = await page.locator('button[type="submit"], button:has-text("Sign In")').first();
      await loginButton.click();
      
      console.log('⏳ Waiting for login redirect...');
      await page.waitForTimeout(3000);
      
      await page.screenshot({ path: 'debug-03-after-login.png' });
    }

    // Navigate to student dashboard
    console.log('🎓 Trying to navigate to student dashboard...');
    await page.goto('http://localhost:3000/student/dashboard');
    
    // Wait a bit for React to mount
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking screenshot of student dashboard...');
    await page.screenshot({ path: 'debug-04-student-dashboard.png' });
    
    // Check for any React errors on the page
    const errorElements = await page.locator('[class*="error"], .error-boundary').all();
    if (errorElements.length > 0) {
      console.log('🚨 Found error elements on page');
      for (let i = 0; i < errorElements.length; i++) {
        const errorText = await errorElements[i].textContent();
        console.log(`Error ${i + 1}:`, errorText);
      }
    }

    // Check if the page loaded properly
    const dashboardTitle = await page.locator('h1:has-text("Dashboard")').first();
    if (await dashboardTitle.isVisible()) {
      console.log('✅ Dashboard title found');
    } else {
      console.log('❌ Dashboard title not found - might be an error');
    }

    // Look for specific components that might be failing
    const upcomingLessons = await page.locator('text=Your Upcoming Adventures').first();
    if (await upcomingLessons.isVisible()) {
      console.log('✅ UpcomingLessons component loaded');
    } else {
      console.log('❌ UpcomingLessons component failed to load');
    }

    const lessonSummary = await page.locator('text=Lesson Summary').first();
    if (await lessonSummary.isVisible()) {
      console.log('✅ LessonSummary component loaded');
    } else {
      console.log('❌ LessonSummary component failed to load');
    }

    // Wait a bit longer to see if any delayed errors appear
    console.log('⏳ Waiting for potential delayed errors...');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'debug-05-final-state.png' });

  } catch (error) {
    console.log('🔴 Script Error:', error.message);
    await page.screenshot({ path: 'debug-error.png' });
  }

  console.log('🏁 Debug complete. Check the screenshots in the project root.');
  await browser.close();
}

debugStudentDashboard().catch(console.error);
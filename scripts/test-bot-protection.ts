#!/usr/bin/env tsx
/**
 * Bot Protection Testing Script
 *
 * This script tests all three layers of bot protection:
 * 1. Honeypot field detection
 * 2. Cloudflare Turnstile verification
 * 3. Rate limiting
 *
 * Usage:
 *   pnpm tsx scripts/test-bot-protection.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100";
const SIGNUP_ENDPOINT = `${BASE_URL}/api/auth/signup`;

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  expected: string;
  actual: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, message: string, expected: string, actual: string) {
  results.push({ name, passed, message, expected, actual });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${message}`);
}

/**
 * Test Layer 1: Honeypot Field
 */
async function testHoneypot() {
  console.log("\n🔍 Testing Layer 1: Honeypot Field\n");

  // Test 1: Normal signup (no honeypot) should succeed
  try {
    const response = await fetch(SIGNUP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        level: "PRE_PRELIMINARY",
        parentConsent: false,
        honeypot: "", // Empty honeypot (good)
      }),
    });

    const data = await response.json();

    if (response.status === 201 || response.status === 200) {
      logTest(
        "Honeypot Test 1",
        true,
        "Empty honeypot allowed signup",
        "201 or 200 status",
        `${response.status}`
      );
    } else {
      logTest(
        "Honeypot Test 1",
        false,
        "Empty honeypot rejected (unexpected)",
        "201 or 200 status",
        `${response.status}: ${data.message}`
      );
    }
  } catch (error) {
    logTest(
      "Honeypot Test 1",
      false,
      "Request failed",
      "Successful response",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Test 2: Filled honeypot should be rejected
  try {
    const response = await fetch(SIGNUP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bot User",
        email: `bot${Date.now()}@example.com`,
        level: "PRE_PRELIMINARY",
        parentConsent: false,
        honeypot: "I am a bot", // Filled honeypot (bad)
      }),
    });

    const data = await response.json();

    if (response.status === 400) {
      logTest(
        "Honeypot Test 2",
        true,
        "Filled honeypot rejected signup",
        "400 status with error",
        `${response.status}: ${data.message}`
      );
    } else {
      logTest(
        "Honeypot Test 2",
        false,
        "Filled honeypot allowed (SECURITY ISSUE)",
        "400 status",
        `${response.status}`
      );
    }
  } catch (error) {
    logTest(
      "Honeypot Test 2",
      false,
      "Request failed",
      "400 error response",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Test Layer 2: Cloudflare Turnstile
 */
async function testTurnstile() {
  console.log("\n🔍 Testing Layer 2: Cloudflare Turnstile\n");

  // Test 1: Missing Turnstile token (in production mode)
  try {
    const response = await fetch(SIGNUP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        level: "PRE_PRELIMINARY",
        parentConsent: false,
        honeypot: "",
        // Missing turnstileToken
      }),
    });

    const data = await response.json();
    const isDevelopment = process.env.NODE_ENV !== "production";

    if (isDevelopment) {
      logTest(
        "Turnstile Test 1",
        response.status === 200 || response.status === 201,
        "Development mode: Missing token allowed",
        "Success (dev bypass)",
        `${response.status}`
      );
    } else {
      logTest(
        "Turnstile Test 1",
        response.status === 400,
        "Production mode: Missing token rejected",
        "400 status",
        `${response.status}: ${data.message}`
      );
    }
  } catch (error) {
    logTest(
      "Turnstile Test 1",
      false,
      "Request failed",
      "Response",
      error instanceof Error ? error.message : String(error)
    );
  }

  // Test 2: Invalid Turnstile token
  try {
    const response = await fetch(SIGNUP_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        level: "PRE_PRELIMINARY",
        parentConsent: false,
        honeypot: "",
        turnstileToken: "invalid-fake-token-12345",
      }),
    });

    const data = await response.json();

    if (response.status === 400 && data.message.includes("verification")) {
      logTest(
        "Turnstile Test 2",
        true,
        "Invalid token rejected",
        "400 status with verification error",
        `${response.status}: ${data.message}`
      );
    } else {
      logTest(
        "Turnstile Test 2",
        false,
        "Invalid token allowed (SECURITY ISSUE)",
        "400 status",
        `${response.status}`
      );
    }
  } catch (error) {
    logTest(
      "Turnstile Test 2",
      false,
      "Request failed",
      "400 error response",
      error instanceof Error ? error.message : String(error)
    );
  }

  console.log("\n💡 Note: Valid Turnstile tokens can only be generated from the frontend widget.");
  console.log("   To test valid tokens, use the signup form in your browser.\n");
}

/**
 * Test Layer 3: Rate Limiting
 */
async function testRateLimiting() {
  console.log("\n🔍 Testing Layer 3: Rate Limiting\n");

  console.log("⏳ Attempting 6 signups to trigger rate limit...\n");

  let rateLimitTriggered = false;
  let successCount = 0;

  for (let i = 1; i <= 6; i++) {
    try {
      const response = await fetch(SIGNUP_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Rate Test User ${i}`,
          email: `ratetest${Date.now()}-${i}@example.com`,
          level: "PRE_PRELIMINARY",
          parentConsent: false,
          honeypot: "",
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        rateLimitTriggered = true;
        console.log(`   Attempt ${i}: ⛔ Rate limited (${data.message})`);

        logTest(
          "Rate Limit Test",
          true,
          `Rate limit triggered after ${successCount} successful attempts`,
          "429 status after 5 signups",
          `Triggered on attempt ${i}`
        );
        break;
      } else if (response.status === 200 || response.status === 201) {
        successCount++;
        console.log(`   Attempt ${i}: ✅ Allowed (${successCount} successful so far)`);
      } else {
        console.log(`   Attempt ${i}: ❌ Failed with status ${response.status}: ${data.message}`);
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`   Attempt ${i}: ❌ Error: ${error}`);
    }
  }

  if (!rateLimitTriggered) {
    logTest(
      "Rate Limit Test",
      false,
      "Rate limit NOT triggered (SECURITY ISSUE)",
      "429 status after 5 signups",
      `All 6 attempts allowed (${successCount} successful)`
    );
  }

  console.log("\n💡 Note: Rate limit is per IP address. If not triggered, you may need to:");
  console.log("   - Restart the server to reset rate limiter");
  console.log("   - Wait 1 hour for the rate limit window to reset");
  console.log("   - Check that IP detection is working correctly\n");
}

/**
 * Print summary report
 */
function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 BOT PROTECTION TEST SUMMARY");
  console.log("=".repeat(60) + "\n");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    console.log("Failed Tests:\n");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`❌ ${r.name}`);
        console.log(`   Message: ${r.message}`);
        console.log(`   Expected: ${r.expected}`);
        console.log(`   Actual: ${r.actual}\n`);
      });
  }

  console.log("=".repeat(60) + "\n");

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("\n🤖 BOT PROTECTION TESTING SUITE\n");
  console.log(`Testing endpoint: ${SIGNUP_ENDPOINT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}\n`);

  try {
    await testHoneypot();
    await testTurnstile();
    await testRateLimiting();
    printSummary();
  } catch (error) {
    console.error("\n❌ Test suite failed with error:", error);
    process.exit(1);
  }
}

// Run tests
runTests();

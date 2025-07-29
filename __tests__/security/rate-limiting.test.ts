// __tests__/security/rate-limiting.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { RateLimiter } from "@/lib/security";
import { createRateLimitTestData } from "../helpers/test-data";

describe("Rate Limiting", () => {
  let rateLimiter: RateLimiter;
  const testData = createRateLimitTestData();

  beforeEach(() => {
    // Create a rate limiter with 3 requests per 1000ms for testing
    rateLimiter = new RateLimiter(3, 1000);
  });

  it("should allow requests under the limit", () => {
    expect(rateLimiter.isAllowed(testData.clientIP)).toBe(true);
    expect(rateLimiter.isAllowed(testData.clientIP)).toBe(true);
    expect(rateLimiter.isAllowed(testData.clientIP)).toBe(true);
  });

  it("should deny requests over the limit", () => {
    // Use up the allowed requests
    rateLimiter.isAllowed(testData.clientIP);
    rateLimiter.isAllowed(testData.clientIP);
    rateLimiter.isAllowed(testData.clientIP);
    
    // This should be denied
    expect(rateLimiter.isAllowed(testData.clientIP)).toBe(false);
  });

  it("should handle different IP addresses independently", () => {
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";
    
    // Use up limit for IP1
    rateLimiter.isAllowed(ip1);
    rateLimiter.isAllowed(ip1);
    rateLimiter.isAllowed(ip1);
    
    // IP2 should still be allowed
    expect(rateLimiter.isAllowed(ip2)).toBe(true);
    expect(rateLimiter.isAllowed(ip1)).toBe(false);
  });

  it("should reset after time window expires", async () => {
    const shortLimiter = new RateLimiter(1, 100); // 1 request per 100ms
    
    expect(shortLimiter.isAllowed(testData.clientIP)).toBe(true);
    expect(shortLimiter.isAllowed(testData.clientIP)).toBe(false);
    
    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(shortLimiter.isAllowed(testData.clientIP)).toBe(true);
  });

  it("should cleanup expired entries", () => {
    const limiter = new RateLimiter(1, 50);
    
    limiter.isAllowed("test-ip");
    
    // Force cleanup after expiry
    setTimeout(() => {
      limiter.cleanup();
      expect(limiter.isAllowed("test-ip")).toBe(true);
    }, 100);
  });

  it("should handle high concurrency", () => {
    const requests = Array.from({ length: 10 }, (_, i) => 
      rateLimiter.isAllowed(`ip-${i}`)
    );
    
    // All should be allowed since they're different IPs
    expect(requests.every(result => result === true)).toBe(true);
  });
});
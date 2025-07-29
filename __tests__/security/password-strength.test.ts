// __tests__/security/password-strength.test.ts
import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "@/lib/security";

describe("Password Strength Validation", () => {
  it("should reject passwords shorter than 8 characters", () => {
    const result = validatePasswordStrength("Pass1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters long");
  });

  it("should reject passwords longer than 128 characters", () => {
    const longPassword = "A".repeat(129) + "a1!";
    const result = validatePasswordStrength(longPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must be less than 128 characters long");
  });

  it("should reject passwords without lowercase letters", () => {
    const result = validatePasswordStrength("PASSWORD123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one lowercase letter");
  });

  it("should reject passwords without uppercase letters", () => {
    const result = validatePasswordStrength("password123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one uppercase letter");
  });

  it("should reject passwords without numbers", () => {
    const result = validatePasswordStrength("Password!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one number");
  });

  it("should reject passwords without special characters", () => {
    const result = validatePasswordStrength("Password123");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one special character");
  });

  it("should accept strong passwords", () => {
    const strongPasswords = [
      "Password123!",
      "MySecure@Pass1",
      "Complex#Password9",
      "Strong$Pass123",
      "Secure&Pass456"
    ];

    for (const password of strongPasswords) {
      const result = validatePasswordStrength(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("should return multiple errors for very weak passwords", () => {
    const result = validatePasswordStrength("weak");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors).toContain("Password must be at least 8 characters long");
    expect(result.errors).toContain("Password must contain at least one uppercase letter");
    expect(result.errors).toContain("Password must contain at least one number");
    expect(result.errors).toContain("Password must contain at least one special character");
  });

  it("should handle edge cases", () => {
    expect(validatePasswordStrength("").isValid).toBe(false);
    expect(validatePasswordStrength(" ".repeat(10)).isValid).toBe(false);
  });
});
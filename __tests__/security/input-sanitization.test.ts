// __tests__/security/input-sanitization.test.ts
import { describe, expect, it } from "vitest";
import { sanitizeInput } from "@/lib/security";
import { createMaliciousInput } from "../helpers/test-data";

describe("Input Sanitization", () => {
  const maliciousInputs = createMaliciousInput();

  it("should sanitize XSS payloads", () => {
    const result = sanitizeInput(maliciousInputs.xssPayload);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("javascript:");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    // alert( is still there but quotes are escaped, which is safe
    expect(result).toContain("alert(&#x27;");
  });

  it("should sanitize HTML injection attempts", () => {
    const result = sanitizeInput(maliciousInputs.htmlInjection);
    expect(result).not.toContain("<img");
    expect(result).not.toContain("onerror");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });

  it("should remove javascript: protocols", () => {
    const input = "javascript:alert('xss')";
    const result = sanitizeInput(input);
    expect(result).not.toContain("javascript:");
    expect(result).toBe("alert(&#x27;xss&#x27;)");
  });

  it("should remove vbscript: protocols", () => {
    const input = "vbscript:msgbox('xss')";
    const result = sanitizeInput(input);
    expect(result).not.toContain("vbscript:");
    expect(result).toBe("msgbox(&#x27;xss&#x27;)");
  });

  it("should remove event handlers", () => {
    const input = "text onclick=alert('xss') more text";
    const result = sanitizeInput(input);
    expect(result).not.toContain("onclick=");
    expect(result).toBe("text alert(&#x27;xss&#x27;) more text");
  });

  it("should limit input length", () => {
    const result = sanitizeInput(maliciousInputs.longString);
    expect(result.length).toBeLessThanOrEqual(10000);
  });

  it("should handle empty and null inputs", () => {
    expect(sanitizeInput("")).toBe("");
    expect(sanitizeInput(null as any)).toBe("");
    expect(sanitizeInput(undefined as any)).toBe("");
  });

  it("should preserve normal text", () => {
    const normalText = "Hello, this is normal text with numbers 123!";
    const result = sanitizeInput(normalText);
    expect(result).toBe(normalText);
  });

  it("should escape quotes properly", () => {
    const input = `He said "Hello" and 'Goodbye'`;
    const result = sanitizeInput(input);
    expect(result).toContain("&quot;");
    expect(result).toContain("&#x27;");
  });
});

// .storybook/mocks/security.browser.ts
//
// Browser-safe stubs for src/lib/security.ts — used by Storybook only.
//
// Wired in via .storybook/main.ts viteFinal alias. Vite resolves
// "@/lib/security" to this file BEFORE Rollup sees the node:crypto import,
// so Storybook bundles never hit the "randomBytes is not exported by
// __vite-browser-external" error.
//
// IMPORTANT: keep the export shape in sync with src/lib/security.ts.
// Missing an export here = runtime error when a story renders a component
// that uses it. Run `grep -E "^export " src/lib/security.ts` to compare.
//
// Architectural follow-up (deferred to v2.1): split server-only query
// files from client-safe schemas so this stub is no longer needed.
// See .planning/phases/22-project-storybook-audit/22-RESEARCH.md
// §Recommended Fix: Two-Layer Strategy (Architectural).

/** Web Crypto API hex token — replaces node:randomBytes(length).toString("hex"). */
export function generateSecureToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** No-op in Storybook — real impl validates env vars + DB URL. */
export function validateSecurityEnvironment(): void {
  return;
}

/** Plain-equality stub — real impl uses timingSafeEqual to defend against timing attacks. */
export function safeCompare(a: string, b: string): boolean {
  return a === b;
}

/** Identity stub — real impl strips control chars + HTML. */
export function sanitizeInput(input: string): string {
  return input;
}

/** Permissive rate-limiter stub — never throttles in stories. */
export const authRateLimiter = {
  isAllowed: (_id: string) => true,
  cleanup: () => undefined,
};

export const apiRateLimiter = {
  isAllowed: (_id: string) => true,
  cleanup: () => undefined,
};

export const turnstileTokenTracker = {
  markUsed: (_token: string) => true,
  isUsed: (_token: string) => false,
  cleanup: () => undefined,
};

/** No-op log — real impl writes structured events. */
export function logSecurityEvent(..._args: unknown[]): void {
  return;
}

/** Always-valid stub — real impl checks zxcvbn-style rules. */
export function validatePasswordStrength(_password: string): {
  isValid: boolean;
  errors: string[];
} {
  return { isValid: true, errors: [] };
}

/** Always-valid stub — real impl checks Content-Security-Policy etc. */
export function validateSecurityHeaders(_headers: Record<string, string>): boolean {
  return true;
}

/** Static stub — real impl parses x-forwarded-for / x-real-ip headers. */
export function getClientIP(_headers: Headers): string {
  return "storybook";
}

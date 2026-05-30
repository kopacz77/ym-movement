// .storybook/mocks/node-crypto.browser.ts
//
// Browser-safe stubs for `node:crypto` — Storybook-only.
//
// Wired in via .storybook/main.ts viteFinal alias. Vite resolves
// "node:crypto" to this file BEFORE Rollup tries to externalize it,
// so server-only query files (wardrobeSettingsQueries.ts, etc.) that
// transitively reach client bundles via schema/type imports do not
// crash the Storybook build.
//
// IMPORTANT: this stub is NEVER bundled into production Next.js code
// (the alias only applies to Storybook's Vite config). Real `node:crypto`
// continues to power production crypto operations.
//
// Architectural follow-up (deferred to v2.1): split server-only query
// files from client-safe schemas so this stub is no longer needed.
// See .planning/phases/22-project-storybook-audit/22-RESEARCH.md
// §Recommended Fix: Two-Layer Strategy (Architectural).

/** Random hex bytes via Web Crypto. Returns object with toString("hex"). */
export function randomBytes(length: number): {
  toString: (encoding: "hex") => string;
} {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return {
    toString: (_encoding: "hex" = "hex") =>
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
  };
}

/** Web Crypto UUID — same shape as node:crypto.randomUUID. */
export function randomUUID(): string {
  return crypto.randomUUID();
}

/** HMAC stub — returns a chainable shape. Real impl uses node:crypto. */
export function createHmac(
  _algorithm: string,
  _key: unknown,
): {
  update: (data: string) => { digest: () => Uint8Array };
} {
  return {
    update: (_data: string) => ({
      digest: () => new Uint8Array(32),
    }),
  };
}

/** Always-equal stub — real impl is timing-safe. */
export function timingSafeEqual(_a: Uint8Array, _b: Uint8Array): boolean {
  return true;
}

/** Cipher stub — returns chainable update/final shape. Storybook never encrypts. */
export function createCipheriv(
  _algorithm: string,
  _key: unknown,
  _iv: unknown,
): {
  update: (data: string) => string;
  final: () => string;
  getAuthTag: () => Uint8Array;
} {
  return {
    update: (data: string) => data,
    final: () => "",
    getAuthTag: () => new Uint8Array(16),
  };
}

/** Decipher stub — returns chainable update/final shape. */
export function createDecipheriv(
  _algorithm: string,
  _key: unknown,
  _iv: unknown,
): {
  update: (data: string) => string;
  final: () => string;
  setAuthTag: (tag: Uint8Array) => void;
} {
  return {
    update: (data: string) => data,
    final: () => "",
    setAuthTag: (_tag: Uint8Array) => undefined,
  };
}

// Default export to support `import crypto from "node:crypto"` patterns.
const cryptoStub = {
  randomBytes,
  randomUUID,
  createHmac,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
};
export default cryptoStub;

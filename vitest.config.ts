import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      // Quarantined test trees — the `.disabled` suffix marks them out-of-suite
      // on purpose. Without this, vitest's glob still descends into them and
      // fails with EIO on the WSL /mnt/c bridge.
      "**/*.disabled/**",
      // Playwright specs live under tests/ and run via `pnpm test:e2e`, not vitest.
      "tests/**",
    ],
    // Cap worker parallelism. Each worker loads the Next.js signup route (plus its
    // transitive imports) and sits around 1+ GB of RAM; on an 8 GB WSL box with
    // the dev server running, the default (CPU-count workers) OOM'd the machine
    // and orphaned 3 workers that pinned 3.8 GB of RAM until manually killed.
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-themes", "@storybook/addon-a11y"],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  docs: {
    autodocs: "tag",
  },
  // viteFinal: tactical alias to unblock Storybook builds while a server-only
  // split of *Queries.ts files is deferred to v2.1. Without this, 6 client
  // components that import schemas/types from server query files transitively
  // pull node:crypto into the browser bundle, which Vite (correctly) refuses
  // to polyfill. See .planning/phases/22-project-storybook-audit/22-RESEARCH.md
  // §randomBytes Blocker for full diagnosis + the architectural fix plan.
  //
  // NOTE: we deliberately do NOT `import { mergeConfig } from "vite"` here —
  // vite is a transitive dep of @storybook/nextjs-vite and is not hoisted to
  // top-level node_modules under pnpm's strict resolution. Instead we mutate
  // resolve.alias directly. This is safe because we only ADD an alias entry;
  // we never replace the alias object wholesale.
  viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    const existingAlias = viteConfig.resolve.alias;
    const aliasMap = {
      // src/lib/security.ts imports node:crypto at the top level.
      "@/lib/security": path.resolve(__dirname, "./mocks/security.browser.ts"),
      // Several *Queries.ts files import `node:crypto` directly (randomUUID,
      // randomBytes). When a client component imports a schema/type from one
      // of these files, the import chain pulls node:crypto into the browser
      // bundle. The security alias above only fixes ONE bleed path; this
      // node:crypto stub covers the rest without us having to enumerate
      // every leaking query file.
      "node:crypto": path.resolve(__dirname, "./mocks/node-crypto.browser.ts"),
    };
    if (Array.isArray(existingAlias)) {
      viteConfig.resolve.alias = [
        ...existingAlias,
        { find: "@/lib/security", replacement: aliasMap["@/lib/security"] },
        { find: "node:crypto", replacement: aliasMap["node:crypto"] },
      ];
    } else {
      viteConfig.resolve.alias = { ...(existingAlias ?? {}), ...aliasMap };
    }
    return viteConfig;
  },
};

export default config;

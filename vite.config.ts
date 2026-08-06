// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import babel from "vite-plugin-babel";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Transpiles modern JS syntax (?.  ??  ??=  ||=  &&=) for WebOS/LG TV (old Chromium).
      // Applied only to pre-compiled .js/.mjs in node_modules and project source.
      babel({
        babelConfig: {
          babelrc: false,
          configFile: false,
          parserOpts: {
            plugins: ["jsx"],
          },
          plugins: [
            "@babel/plugin-transform-optional-chaining",
            "@babel/plugin-transform-nullish-coalescing-operator",
            "@babel/plugin-transform-logical-assignment-operators",
          ],
        },
        // Only process already-compiled JS files (not raw .ts/.tsx which Vite handles via oxc)
        filter: /\.(js|mjs|cjs)$/,
      }),
    ],
    build: {
      target: "es2018",
    },
  },
});

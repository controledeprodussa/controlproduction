// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import babel from "vite-plugin-babel";
import legacy from "@vitejs/plugin-legacy";

/**
 * Wraps every sub-plugin returned by plugin-legacy so they only apply to the
 * "client" Vite environment (Vite 6 Environment API).
 * This prevents SystemJS/legacy helpers from being injected into Nitro's SSR
 * build, which would cause "Rolldown failed to resolve import '_'" errors.
 */
function clientOnlyLegacy(): any[] {
  return legacy({
    targets: ["chrome >= 53", "safari >= 10", "not IE 11"],
    additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
  }).map((plugin: any) => ({
    ...plugin,
    // Vite 6 Environment API: limits the plugin to the client environment only
    applyToEnvironment(env: { name: string }) {
      return env.name === "client";
    },
  }));
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Generates <script nomodule> bundles for old TV browsers (Chrome < 61)
      // that completely ignore <script type="module">, causing white screens.
      // applyToEnvironment ensures it never touches the SSR/Nitro build.
      ...clientOnlyLegacy(),

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
      // Smart TVs antigas (LG webOS 3/4, Philco) rodam Chromium bem antigo
      target: ["es2015", "chrome53"],
      cssTarget: "chrome53",
    },
  },
});

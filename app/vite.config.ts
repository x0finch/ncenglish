import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

/** Trailing slash, e.g. `/nceEnglish/` for GitHub project Pages. Default `/`. */
const base = (process.env.VITE_BASE_PATH ?? "/").replace(/([^/])$/, "$1/");

// Dev server only; no VITE_ prefix (not exposed to client). Always use development env files.
const devEnv = loadEnv("development", process.cwd(), "");
const devAllowedHosts = (devEnv.DEV_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

export default defineConfig({
  base,
  plugins: [
    devtools(),
    tanstackRouter({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "NCE Player",
        short_name: "NCE",
        description: "New Concept English listening player",
        // Match app dark background (pure black) for iOS splash + chrome.
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: base,
      },
    }),
  ],
  server: {
    ...(devAllowedHosts.length > 0 ? { allowedHosts: devAllowedHosts } : {}),
  },
});

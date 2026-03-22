import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

/** Trailing slash, e.g. `/nceEnglish/` for GitHub project Pages. Default `/`. */
const base = (process.env.VITE_BASE_PATH ?? "/").replace(/([^/])$/, "$1/");

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
        theme_color: "#173a40",
        background_color: "#e7f3ec",
        display: "standalone",
        start_url: base,
      },
    }),
  ],
});

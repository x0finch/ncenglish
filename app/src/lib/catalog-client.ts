import catalog from "@nce/catalog";
import { logMediaInfo, logMediaWarn } from "./client-media-log.ts";

let inited = false;

/** Pure helper for tests: normalize trailing slashes; empty env → "". */
export function normalizePublicMediaBase(envBaseUrl: string | undefined): string {
  const fromEnv = envBaseUrl?.trim();
  if (!fromEnv) return "";
  return fromEnv.replace(/\/+$/, "");
}

/** Public CDN / R2 custom domain root for catalog media (no Worker proxy). */
export function resolveCatalogBaseUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return normalizePublicMediaBase(import.meta.env.VITE_NCE_MEDIA_BASE_URL);
}

/** Idempotent `catalog.init` on the client; call once from the app shell (`__root`). No-op on SSR. */
export function initClientCatalog(): void {
  if (inited || typeof window === "undefined") return;
  const baseUrl = resolveCatalogBaseUrl();
  if (!baseUrl) {
    logMediaWarn(
      "VITE_NCE_MEDIA_BASE_URL is unset; audio/LRC URLs will be invalid. Set it to your public media origin (no trailing slash).",
    );
  }
  catalog.init({ baseUrl });
  inited = true;
  logMediaInfo("catalog.init", {
    baseUrl: baseUrl || "(empty)",
    viteBase: import.meta.env.VITE_NCE_MEDIA_BASE_URL ?? "(unset)",
    origin: window.location.origin,
  });
}

/** Test helper */
export function __resetCatalogInitForTesting(): void {
  inited = false;
}

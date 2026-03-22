# @nce/app

TanStack Start + Vite + Cloudflare Workers front-end for the NCE player. Uses `@nce/catalog`, `@nce/player`, HeroUI v3, Tailwind v4, Zustand `persist`, and `vite-plugin-pwa` (static precache only).

## Prerequisites

- Node 22+ (TanStack Start engine field).
- pnpm at repo root.
- Enough disk space for `workerd` / Wrangler install.
- A **publicly reachable** origin for lesson media (R2 public bucket URL, R2 custom domain, or CDN) whose object paths match `nce-r2-index.json` (`mirrorRoot` + unit basenames).

## Environment

| Variable | Purpose |
|----------|---------|
| **`VITE_NCE_MEDIA_BASE_URL`** | **Required** for working audio/LRC. Public origin only (no trailing slash), e.g. `https://pub-xxxxx.r2.dev` or your CDN. The app builds MP3/LRC/cover URLs as `{base}/{mirrorRoot}/…`. |
| `VITE_NCE_LOG_MEDIA` | Set to `1` in `.env` to print **verbose** client logs in production builds (`catalog.init` baseUrl, resolved `audioUrl` / `lrcUrl`, parse counts). |

### Debug logs

- **Browser console — `[nce:media]`** — **`warn`** on missing `VITE_NCE_MEDIA_BASE_URL`, LRC HTTP errors, `<audio>` errors, missing book/unit; **`info`** only in `pnpm dev` or when `VITE_NCE_LOG_MEDIA=1`.

There is **no** Worker `/media` proxy: the browser loads media directly from `VITE_NCE_MEDIA_BASE_URL`.

### CORS for `.lrc` (required)

MP3 is loaded with `<audio src>` and often **works without** CORS. Lyrics use **`fetch()`**, which **requires** the media host to allow your app origin.

If DevTools shows `net::ERR_FAILED` or `Failed to fetch` while the request row still shows **200**, the response is almost certainly **blocked by CORS** (no usable `Access-Control-Allow-Origin` for your page).

**Cloudflare R2:** open the bucket → **Settings** → **CORS policy** and add a rule, for example:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://YOUR-APP-DOMAIN"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

Include every origin you use in the browser (check the address bar), e.g. `http://localhost:5173` if Vite picks that port. For a quick local test you may temporarily use `"AllowedOrigins": ["*"]` (avoid in production if you rely on cookie-based auth on the same bucket). After saving, retry with a hard refresh.

## Scripts (from `app/`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Vite dev server (port **3000**). Loads `app/.env` and inlines `VITE_*` into the client bundle. |
| `pnpm build` | Production build. |
| `pnpm cf:build` | Same as `build` with `CF=1` set (alias for docs / CI parity). |
| `pnpm cf:dev` | **`vite dev`** (same stack as Cloudflare’s TanStack Start guide): Worker + app in workerd, **with** Vite env — use this or `pnpm dev` so `VITE_NCE_MEDIA_BASE_URL` applies. |
| `pnpm wrangler:dev` | Raw `wrangler dev` only: **does not** run Vite, so the browser may get **stale `dist/`** JS and ignore `.env`; media URLs can wrongly stay on `/media`. Prefer `pnpm cf:dev` / `pnpm dev`. |
| `pnpm cf:deploy` | Build + `wrangler deploy`. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm test:run` | Vitest unit tests. |
| `pnpm e2e` | Playwright smoke tests (starts dev server on 127.0.0.1:3000). |

## PWA

Production builds register a service worker via `vite-plugin-pwa` that precaches **built static assets** only—not lesson audio or LRC.

## Route tree

If `src/routeTree.gen.ts` is missing or out of date, run `pnpm dev` once; the TanStack Router plugin regenerates it from `src/routes/`.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin for MP3/LRC/cover URLs (R2 public bucket, custom domain, or CDN). No trailing slash. */
  readonly VITE_NCE_MEDIA_BASE_URL?: string;
  /** Set to "1" to log catalog baseUrl, resolved audio/LRC URLs, and audio events in production builds. */
  readonly VITE_NCE_LOG_MEDIA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

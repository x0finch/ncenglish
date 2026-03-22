import type { NceBook } from "./schema.ts";

export function normalizeBaseUrl(base: string): string {
  return base.replace(/\/+$/, "");
}

/** Join base URL with path segments; each segment is encoded for use as a single path component. */
export function joinPublicUrl(baseUrl: string, ...pathSegments: string[]): string {
  const base = normalizeBaseUrl(baseUrl);
  const path = pathSegments.map((s) => encodeURIComponent(s)).join("/");
  return `${base}/${path}`;
}

export function splitMirrorRoot(mirrorRoot: string): string[] {
  return mirrorRoot.split("/").filter(Boolean);
}

export function resolveBookUrls(book: NceBook, baseUrl: string) {
  const parts = splitMirrorRoot(book.mirrorRoot);
  return {
    cover: joinPublicUrl(baseUrl, ...parts, book.coverFile),
    bookJson: joinPublicUrl(baseUrl, ...parts, "book.json"),
  };
}

export function resolveUnitUrls(
  book: NceBook,
  baseUrl: string,
  unitEntry: string,
) {
  const parts = splitMirrorRoot(book.mirrorRoot);
  return {
    audio: joinPublicUrl(baseUrl, ...parts, `${unitEntry}.mp3`),
    lrc: joinPublicUrl(baseUrl, ...parts, `${unitEntry}.lrc`),
  };
}

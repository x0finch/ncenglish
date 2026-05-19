import type { Page } from "@playwright/test";

/** Must match `zustand` persist key in `nce-store.ts`. */
export const NCE_SESSION_KEY = "nce:app-session";

const defaultPersistState = {
  bookKey: null as string | null,
  unitIndex: 0,
  trackPlayMode: "sequential" as const,
  playbackRate: 1,
  translationMode: "show" as const,
  lyricClickMode: "jumpOnly" as const,
  suppressAutoplay: false,
};

export type PersistSlice = typeof defaultPersistState;

/** Zustand persist envelope written to `localStorage`. */
export function encodeSession(partial: Partial<PersistSlice> = {}) {
  return JSON.stringify({
    state: { ...defaultPersistState, ...partial },
    version: 0,
  });
}

/** Classic NCE1 card (not the 85 edition). */
export function nce1ClassicCard(page: Page) {
  return page.getByRole("button", {
    name: /^NCE1 English Book(?!.*\(85\))/,
  });
}

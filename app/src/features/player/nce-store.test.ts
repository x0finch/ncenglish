import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/catalog-client.ts", () => ({
  initClientCatalog: vi.fn(),
  normalizePublicMediaBase: vi.fn(),
  resolveCatalogBaseUrl: vi.fn(() => ""),
  __resetCatalogInitForTesting: vi.fn(),
}));

vi.mock("@nce/catalog", () => ({
  default: {
    init: vi.fn(),
    getBook: vi.fn((k: string) =>
      k === "B1" ? { key: "B1", title: "Book", units: ["a", "b"] } : undefined,
    ),
    listUnits: vi.fn((k: string) =>
      k === "B1"
        ? [
            { entry: "a", index: 0 },
            { entry: "b", index: 1 },
          ]
        : [],
    ),
    getUnitMedia: vi.fn(() => ({
      audioUrl: "https://x/a.mp3",
      lrcUrl: "https://x/a.lrc",
      coverUrl: "https://x/c.jpg",
      bookJsonUrl: "https://x/book.json",
    })),
    parseLyrics: vi.fn(() => []),
    activeLyricIndex: vi.fn(() => 0),
  },
}));

import { useNceStore } from "./nce-store.ts";

describe("useNceStore onAudioEnded", () => {
  beforeEach(() => {
    localStorage.clear();
    useNceStore.persist.clearStorage();
    useNceStore.setState({
      bookKey: null,
      unitIndex: 0,
      trackPlayMode: "sequential",
      playbackRate: 1,
      translationMode: "show",
      pauseAfterLineIndex: null,
      lyricLines: [],
      lyricsStatus: "idle",
      lyricsError: null,
    });
  });

  it("advances to next unit in sequential mode", () => {
    useNceStore.getState().setBook("B1", 0);
    const res = useNceStore.getState().onAudioEnded();
    expect(res.action).toBe("next");
    expect(useNceStore.getState().unitIndex).toBe(1);
  });

  it("stops at last unit", () => {
    useNceStore.getState().setBook("B1", 1);
    const res = useNceStore.getState().onAudioEnded();
    expect(res.action).toBe("stop");
    expect(useNceStore.getState().unitIndex).toBe(1);
  });
});

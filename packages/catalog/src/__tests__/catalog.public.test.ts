import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCatalogStateForTesting,
  catalog,
} from "../catalog.ts";
import type {
  BookDetail,
  Catalog,
  LyricLine,
  UnitMedia,
} from "../index.ts";

describe("catalog (public API)", () => {
  beforeEach(() => {
    __resetCatalogStateForTesting();
    catalog.init({ baseUrl: "https://r2.example.com" });
  });

  it("getUnitMedia throws if init was not called", () => {
    __resetCatalogStateForTesting();
    expect(() =>
      catalog.getUnitMedia("NCE1", "001&002.Excuse Me"),
    ).toThrow(/catalog\.init/);
  });

  it("getIndex returns bundled v2 index", () => {
    const idx = catalog.getIndex();
    expect(idx.version).toBe(2);
    expect(idx.books.length).toBe(8);
  });

  it("listBooks returns summaries with edition", () => {
    const books = catalog.listBooks();
    expect(books.length).toBe(8);
    const nce1 = books.find((b) => b.key === "NCE1");
    expect(nce1?.edition).toBe("classic");
    expect(nce1?.unitCount).toBeGreaterThan(0);
    const nce85 = books.find((b) => b.key === "NCE1(85)");
    expect(nce85?.edition).toBe("85");
  });

  it("getBook returns book detail", () => {
    const b: BookDetail | undefined = catalog.getBook("NCE1");
    expect(b?.units[0]).toBe("001&002.Excuse Me");
    expect(b?.mirrorRoot).toBe("nce/NCE1");
  });

  it("listUnits returns ordered entries", () => {
    const units = catalog.listUnits("NCE1");
    expect(units[0]?.entry).toBe("001&002.Excuse Me");
    expect(units[0]?.index).toBe(0);
  });

  it("listUnits returns empty for unknown book", () => {
    expect(catalog.listUnits("NCE99")).toEqual([]);
  });

  it("getBookCoverUrl matches getUnitMedia cover", () => {
    expect(catalog.getBookCoverUrl("NCE1")).toBe(
      catalog.getUnitMedia("NCE1", "001&002.Excuse Me").coverUrl,
    );
    expect(catalog.getBookCoverUrl("NCE1")).toContain("NCE1.jpg");
  });

  it("getBookCoverUrl throws for unknown book", () => {
    expect(() => catalog.getBookCoverUrl("NCE404")).toThrow(/Unknown book/);
  });

  it("getUnitMedia encodes URLs after init", () => {
    const m: UnitMedia = catalog.getUnitMedia(
      "NCE1",
      "001&002.Excuse Me",
    );
    expect(m.audioUrl).toContain("001%26002.Excuse%20Me.mp3");
    expect(m.lrcUrl).toContain(".lrc");
    expect(m.coverUrl).toContain("NCE1.jpg");
    expect(m.bookJsonUrl).toContain("book.json");
  });

  it("getUnitMedia throws for unknown unit", () => {
    expect(() => catalog.getUnitMedia("NCE1", "no.such.unit")).toThrow(
      /Unknown unit/,
    );
  });

  it("getUnitMedia throws for unknown book", () => {
    expect(() => catalog.getUnitMedia("NCE404", "x")).toThrow(/Unknown book/);
  });

  it("parseLyrics returns LyricLine with timeSec", () => {
    const lines = catalog.parseLyrics("[00:01.00]Hi | 嗨");
    expect(lines[0]?.timeSec).toBe(1);
    expect(lines[0]?.english).toBe("Hi");
    expect(lines[0]?.chinese).toBe("嗨");
  });

  it("parseLyrics useLegacySyncOffset", () => {
    const plain = catalog.parseLyrics("[01:01.00]x");
    const legacy = catalog.parseLyrics("[01:01.00]x", {
      useLegacySyncOffset: true,
    });
    expect(legacy[0]!.timeSec).toBe(plain[0]!.timeSec - 0.5);
  });

  it("activeLyricIndex works on LyricLine[]", () => {
    const lines: LyricLine[] = [
      { timeSec: 1, english: "A", chinese: "" },
      { timeSec: 3, english: "B", chinese: "" },
    ];
    expect(catalog.activeLyricIndex(lines, 2)).toBe(0);
    expect(catalog.activeLyricIndex(lines, 3)).toBe(1);
  });

  it("Catalog type is assignable from default export", async () => {
    const mod = await import("../index.ts");
    const c: Catalog = mod.default;
    expect(c.getBook("NCE2")).toBeDefined();
  });

  it("getBook is undefined for missing key", () => {
    expect(catalog.getBook("missing")).toBeUndefined();
  });
});

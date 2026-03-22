import { describe, expect, it } from "vitest";
import {
  joinPublicUrl,
  normalizeBaseUrl,
  resolveBookUrls,
  resolveUnitUrls,
  splitMirrorRoot,
} from "../../internal/resolve.ts";
import type { NceBook } from "../../internal/schema.ts";

describe("normalizeBaseUrl", () => {
  it("strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://a.com/")).toBe("https://a.com");
    expect(normalizeBaseUrl("https://a.com///")).toBe("https://a.com");
    expect(normalizeBaseUrl("https://a.com")).toBe("https://a.com");
  });
});

describe("joinPublicUrl", () => {
  it("encodes each segment for HTTP path (ampersand, space)", () => {
    expect(
      joinPublicUrl(
        "https://cdn.example.com",
        "nce",
        "NCE1",
        "001&002.Excuse Me.mp3",
      ),
    ).toBe(
      "https://cdn.example.com/nce/NCE1/001%26002.Excuse%20Me.mp3",
    );
  });
});

describe("splitMirrorRoot", () => {
  it("splits on slashes and drops empties", () => {
    expect(splitMirrorRoot("nce/NCE1")).toEqual(["nce", "NCE1"]);
    expect(splitMirrorRoot("/nce/NCE2/")).toEqual(["nce", "NCE2"]);
  });
});

describe("resolveUnitUrls", () => {
  const book: NceBook = {
    key: "NCE1",
    title: "NCE1 English Book",
    mirrorRoot: "nce/NCE1",
    bookName: "NCE",
    bookLevel: "1st Level",
    coverFile: "NCE1.jpg",
    units: ["001&002.Excuse Me"],
  };

  it("builds audio and lrc URLs with encoded unit basename", () => {
    const base = "https://r2.example.com";
    expect(resolveUnitUrls(book, base, "001&002.Excuse Me")).toEqual({
      audio:
        "https://r2.example.com/nce/NCE1/001%26002.Excuse%20Me.mp3",
      lrc: "https://r2.example.com/nce/NCE1/001%26002.Excuse%20Me.lrc",
    });
  });
});

describe("resolveBookUrls", () => {
  const book: NceBook = {
    key: "NCE2",
    title: "NCE2",
    mirrorRoot: "nce/NCE2",
    bookName: "NCE",
    bookLevel: "2",
    coverFile: "NCE2.jpg",
    units: [],
  };

  it("builds cover and book.json URLs", () => {
    const base = "https://r2.example.com/";
    expect(resolveBookUrls(book, base)).toEqual({
      cover: "https://r2.example.com/nce/NCE2/NCE2.jpg",
      bookJson: "https://r2.example.com/nce/NCE2/book.json",
    });
  });
});

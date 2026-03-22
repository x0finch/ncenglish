import { describe, expect, it } from "vitest";
import {
  NCE_LEGACY_SYNC_OFFSET,
  findActiveLineIndex,
  parseLrc,
} from "../../internal/parse-lrc.ts";

describe("parseLrc", () => {
  it("parses lines with [mm:ss.xx] and sorts by time", () => {
    const text = `[00:02.00]Second line
[00:01.00]First line`;
    const lines = parseLrc(text);
    expect(lines.map((l) => l.english)).toEqual(["First line", "Second line"]);
    expect(lines[0]?.time).toBe(1);
    expect(lines[1]?.time).toBe(2);
  });

  it("splits english and chinese on |", () => {
    const lines = parseLrc("[00:00.10]Hello | 你好");
    expect(lines[0]?.english).toBe("Hello");
    expect(lines[0]?.chinese).toBe("你好");
    expect(lines[0]?.english).toBe("Hello");
    expect(lines[0]?.chinese).toBe("你好");
  });

  it("applies syncOffsetSec (legacy NCE uses -0.5)", () => {
    const text = "[01:01.00]Line";
    const legacy = parseLrc(text, { syncOffsetSec: NCE_LEGACY_SYNC_OFFSET });
    expect(legacy[0]?.time).toBe(60 + 1 - 0.5);
    const plain = parseLrc(text);
    expect(plain[0]?.time).toBe(61);
  });

  it("supports [mm:ss] without fractional seconds", () => {
    const lines = parseLrc("[00:05]No ms");
    expect(lines[0]?.time).toBe(5);
  });

  it("ignores non-matching lines", () => {
    const lines = parseLrc("foo\n[00:01.00]Ok\n");
    expect(lines).toHaveLength(1);
  });

  it("trims lyric text", () => {
    const lines = parseLrc("[00:01.00]   spaced   ");
    expect(lines[0]?.english).toBe("spaced");
  });
});

describe("findActiveLineIndex", () => {
  const lines = parseLrc(`[00:01.00]A
[00:03.00]B
[00:05.00]C`);

  it("returns -1 for empty lines", () => {
    expect(findActiveLineIndex([], 0)).toBe(-1);
  });

  it("returns -1 before first line time", () => {
    expect(findActiveLineIndex(lines, 0.5)).toBe(-1);
  });

  it("returns index at exact line start", () => {
    expect(findActiveLineIndex(lines, 3)).toBe(1);
  });

  it("returns previous line between timestamps", () => {
    expect(findActiveLineIndex(lines, 4)).toBe(1);
  });

  it("returns last line at or after last timestamp", () => {
    expect(findActiveLineIndex(lines, 99)).toBe(2);
  });
});

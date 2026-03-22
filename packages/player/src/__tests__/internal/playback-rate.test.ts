import { describe, expect, it } from "vitest";
import {
  PLAYBACK_SPEEDS,
  cyclePlaybackRate,
  normalizePlaybackRate,
} from "../../internal/playback-rate.ts";

describe("playback-rate", () => {
  it("BR-1: cycles from 1 to next tier", () => {
    expect(cyclePlaybackRate(1)).toBe(1.25);
  });

  it("BR-2: wraps from last tier to first", () => {
    expect(cyclePlaybackRate(2)).toBe(0.5);
  });

  it("BR-3: unknown rate snaps then cycles (nearest to 1.0 then next)", () => {
    expect(normalizePlaybackRate(0.9)).toBe(1);
    expect(cyclePlaybackRate(0.9)).toBe(1.25);
  });

  it("BR-mid: steps through an inner tier", () => {
    expect(cyclePlaybackRate(0.75)).toBe(1);
  });

  it("PLAYBACK_SPEEDS matches legacy NCE list", () => {
    expect([...PLAYBACK_SPEEDS]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
  });
});

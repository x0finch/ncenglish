import { describe, expect, it } from "vitest";
import {
  canNext,
  canPrev,
  nextUnitIndex,
  prevUnitIndex,
} from "../../internal/track-navigation.ts";

describe("track-navigation", () => {
  it("TN-1", () => {
    expect(nextUnitIndex(0, 5)).toBe(1);
  });

  it("TN-2: stays at last index", () => {
    expect(nextUnitIndex(4, 5)).toBe(4);
  });

  it("TN-3", () => {
    expect(prevUnitIndex(1)).toBe(0);
  });

  it("TN-4: stays at 0", () => {
    expect(prevUnitIndex(0)).toBe(0);
  });

  it("TN-5: canNext / canPrev boundaries", () => {
    expect(canNext(0, 5)).toBe(true);
    expect(canNext(4, 5)).toBe(false);
    expect(canPrev(0)).toBe(false);
    expect(canPrev(1)).toBe(true);
  });

  it("TN-edge: unitCount 0 is inert", () => {
    expect(nextUnitIndex(0, 0)).toBe(0);
    expect(canNext(0, 0)).toBe(false);
  });

  it("TN-edge: negative unitIndex clamps then advances", () => {
    expect(nextUnitIndex(-1, 5)).toBe(1);
    expect(prevUnitIndex(-3)).toBe(0);
  });
});

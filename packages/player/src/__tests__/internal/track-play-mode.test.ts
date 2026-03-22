import { describe, expect, it } from "vitest";
import { resolveAfterTrackEnded } from "../../internal/track-play-mode.ts";

describe("track-play-mode", () => {
  it("TP-1", () => {
    expect(
      resolveAfterTrackEnded({
        mode: "sequential",
        unitIndex: 0,
        unitCount: 3,
      }),
    ).toEqual({ action: "next" });
  });

  it("TP-2", () => {
    expect(
      resolveAfterTrackEnded({
        mode: "sequential",
        unitIndex: 2,
        unitCount: 3,
      }),
    ).toEqual({ action: "stop" });
  });

  it("TP-3", () => {
    expect(
      resolveAfterTrackEnded({
        mode: "repeatOne",
        unitIndex: 1,
        unitCount: 3,
      }),
    ).toEqual({ action: "replay" });
  });

  it("TP-4: empty list returns stop", () => {
    expect(
      resolveAfterTrackEnded({
        mode: "sequential",
        unitIndex: 0,
        unitCount: 0,
      }),
    ).toEqual({ action: "stop" });
  });

  it("TP-4: out-of-range index returns stop", () => {
    expect(
      resolveAfterTrackEnded({
        mode: "sequential",
        unitIndex: 5,
        unitCount: 3,
      }),
    ).toEqual({ action: "stop" });
  });

  it("TP-4b: negative unitIndex returns stop", () => {
    expect(
      resolveAfterTrackEnded({
        mode: "sequential",
        unitIndex: -1,
        unitCount: 3,
      }),
    ).toEqual({ action: "stop" });
  });
});

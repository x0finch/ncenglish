import { describe, expect, it } from "vitest";
import player from "../player.ts";
import type { PlayerPreferences, TrackPlayMode } from "../index.ts";

describe("player facade", () => {
  it("PU-1: default export has core members and no Storage on player object", () => {
    expect(typeof player.cyclePlaybackRate).toBe("function");
    expect(typeof player.parsePlayerPreferences).toBe("function");
    expect(typeof player.resolveAfterTrackEnded).toBe("function");
    expect(player.PREFERENCES_STORAGE_KEY).toBeDefined();
    const keys = Object.keys(player);
    expect(keys.some((k) => k.includes("localStorage"))).toBe(false);
  });

  it("PU-2: type smoke (compile-time; runtime shape)", () => {
    const _mode: TrackPlayMode = "sequential";
    const _prefs: PlayerPreferences = player.DEFAULT_PLAYER_PREFERENCES;
    expect(_mode).toBe("sequential");
    expect(_prefs.trackPlayMode).toBe("sequential");
  });

  it("PU-3: facade matches internal behavior samples", () => {
    expect(player.cyclePlaybackRate(1)).toBe(1.25);
    expect(player.nextUnitIndex(0, 5)).toBe(1);
    expect(
      player.resolveAfterTrackEnded({
        mode: "sequential",
        unitIndex: 0,
        unitCount: 3,
      }).action,
    ).toBe("next");
  });
});

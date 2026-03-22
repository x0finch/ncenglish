import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_PREFERENCES,
  mergePlayerPreferences,
  parsePlayerPreferences,
  serializePlayerPreferences,
} from "../../internal/preferences.ts";
import { PREFERENCES_STORAGE_KEY } from "../../internal/storage-keys.ts";

describe("preferences", () => {
  it("PF-1: null and empty string -> defaults", () => {
    expect(parsePlayerPreferences(null)).toEqual(DEFAULT_PLAYER_PREFERENCES);
    expect(parsePlayerPreferences("")).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it("PF-2: round-trip", () => {
    const p = {
      ...DEFAULT_PLAYER_PREFERENCES,
      playbackRate: 1.5 as const,
      translationMode: "hide" as const,
    };
    const s = serializePlayerPreferences(p);
    expect(parsePlayerPreferences(s)).toEqual(p);
  });

  it("PF-3: invalid JSON -> defaults", () => {
    expect(parsePlayerPreferences("{")).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it("PF-3b: empty object coerces field-by-field to defaults", () => {
    expect(parsePlayerPreferences("{}")).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it("PF-3c: non-object JSON (array) -> defaults", () => {
    expect(parsePlayerPreferences("[]")).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it("PF-3d: invalid enum strings fall back per field", () => {
    const raw = JSON.stringify({
      trackPlayMode: "shuffle",
      translationMode: "invisible",
      playbackRate: "fast",
    });
    expect(parsePlayerPreferences(raw)).toEqual(DEFAULT_PLAYER_PREFERENCES);
  });

  it("PF-4: merge preserves unspecified keys", () => {
    const prev = {
      ...DEFAULT_PLAYER_PREFERENCES,
      translationMode: "blur" as const,
    };
    expect(
      mergePlayerPreferences(prev, { playbackRate: 2 }),
    ).toEqual({
      ...prev,
      playbackRate: 2,
    });
  });

  it("PF-5: storage key constant", () => {
    expect(PREFERENCES_STORAGE_KEY).toBe("nce:player-preferences");
  });
});

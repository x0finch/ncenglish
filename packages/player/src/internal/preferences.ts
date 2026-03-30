import type { TrackPlayMode } from "./track-play-mode.ts";
import { PLAYBACK_SPEEDS, normalizePlaybackRate, type PlaybackRate } from "./playback-rate.ts";

export type TranslationMode = "show" | "hide" | "blur" | "clear";

export type PlayerPreferences = {
  trackPlayMode: TrackPlayMode;
  playbackRate: PlaybackRate;
  translationMode: TranslationMode;
};

export const DEFAULT_PLAYER_PREFERENCES: PlayerPreferences = {
  trackPlayMode: "sequential",
  playbackRate: 1,
  translationMode: "show",
};

function isTrackPlayMode(v: unknown): v is TrackPlayMode {
  return v === "sequential" || v === "reverse" || v === "repeatOne";
}

function isTranslationMode(v: unknown): v is TranslationMode {
  return v === "show" || v === "hide" || v === "blur" || v === "clear";
}

function isPlaybackRate(v: unknown): v is PlaybackRate {
  return (
    typeof v === "number" &&
    (PLAYBACK_SPEEDS as readonly number[]).includes(v)
  );
}

function coercePreferences(raw: unknown): PlayerPreferences {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_PLAYER_PREFERENCES };
  }
  const o = raw as Record<string, unknown>;
  const trackPlayMode = isTrackPlayMode(o.trackPlayMode)
    ? o.trackPlayMode
    : DEFAULT_PLAYER_PREFERENCES.trackPlayMode;
  const playbackRate = isPlaybackRate(o.playbackRate)
    ? o.playbackRate
    : normalizePlaybackRate(
        typeof o.playbackRate === "number" ? o.playbackRate : 1,
      );
  const translationMode = isTranslationMode(o.translationMode)
    ? o.translationMode
    : DEFAULT_PLAYER_PREFERENCES.translationMode;
  return { trackPlayMode, playbackRate, translationMode };
}

export function parsePlayerPreferences(raw: string | null | undefined): PlayerPreferences {
  if (raw == null || raw === "") {
    return { ...DEFAULT_PLAYER_PREFERENCES };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return coercePreferences(parsed);
  } catch {
    return { ...DEFAULT_PLAYER_PREFERENCES };
  }
}

export function mergePlayerPreferences(
  prev: PlayerPreferences,
  partial: Partial<PlayerPreferences>,
): PlayerPreferences {
  return {
    trackPlayMode: partial.trackPlayMode ?? prev.trackPlayMode,
    playbackRate: partial.playbackRate ?? prev.playbackRate,
    translationMode: partial.translationMode ?? prev.translationMode,
  };
}

export function serializePlayerPreferences(p: PlayerPreferences): string {
  return JSON.stringify(p);
}

import player from "./player.ts";

/**
 * Headless player facade (rules + preference codecs).
 *
 * - Runtime: `import player from "@nce/player"` then `player.cyclePlaybackRate(1)`, etc.
 * - Types: `import type { PlayerPreferences, TrackPlayMode, … } from "@nce/player"`.
 */
export default player;

export type { PlaybackRate } from "./internal/playback-rate.ts";
export type {
  PlayerPreferences,
  TranslationMode,
} from "./internal/preferences.ts";
export type {
  TrackEndedAction,
  TrackEndedResolution,
  TrackPlayMode,
} from "./internal/track-play-mode.ts";
export { PREFERENCES_STORAGE_KEY } from "./internal/storage-keys.ts";

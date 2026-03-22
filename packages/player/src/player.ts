import {
  DEFAULT_PLAYER_PREFERENCES,
  mergePlayerPreferences,
  parsePlayerPreferences,
  serializePlayerPreferences,
} from "./internal/preferences.ts";
import { PREFERENCES_STORAGE_KEY } from "./internal/storage-keys.ts";
import {
  PLAYBACK_SPEEDS,
  cyclePlaybackRate,
  normalizePlaybackRate,
} from "./internal/playback-rate.ts";
import {
  canNext,
  canPrev,
  nextUnitIndex,
  prevUnitIndex,
} from "./internal/track-navigation.ts";
import { resolveAfterTrackEnded } from "./internal/track-play-mode.ts";
import { cycleTranslationMode } from "./internal/translation-mode.ts";

/**
 * Headless playback rules and preference codecs. No Storage, no audio, no fetch.
 */
const player = {
  PLAYBACK_SPEEDS,
  cyclePlaybackRate,
  normalizePlaybackRate,
  nextUnitIndex,
  prevUnitIndex,
  canNext,
  canPrev,
  resolveAfterTrackEnded,
  DEFAULT_PLAYER_PREFERENCES,
  parsePlayerPreferences,
  mergePlayerPreferences,
  serializePlayerPreferences,
  PREFERENCES_STORAGE_KEY,
  cycleTranslationMode,
};

export default player;

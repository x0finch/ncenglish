/** Matches legacy NCE/js/main.js `availableSpeeds`. */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_SPEEDS)[number];

function indexOfSpeed(rate: number): number {
  return PLAYBACK_SPEEDS.indexOf(rate as PlaybackRate);
}

/**
 * If `current` is not an exact tier, snap to the nearest defined speed; default to 1.
 */
export function normalizePlaybackRate(current: number): PlaybackRate {
  if (indexOfSpeed(current) >= 0) {
    return current as PlaybackRate;
  }
  let best = 1 as PlaybackRate;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const s of PLAYBACK_SPEEDS) {
    const d = Math.abs(s - current);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

export function cyclePlaybackRate(current: number): PlaybackRate {
  const normalized = normalizePlaybackRate(current);
  const i = indexOfSpeed(normalized);
  const next = (i + 1) % PLAYBACK_SPEEDS.length;
  const v = PLAYBACK_SPEEDS[next];
  return v ?? 1;
}

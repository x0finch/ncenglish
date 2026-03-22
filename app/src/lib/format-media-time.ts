/**
 * Format seconds for UI labels (transport, lyric timestamps).
 * Clamps negatives to 0 so legacy LRC sync offsets (e.g. -0.5s) never render as "-1:-1".
 */
export function formatMediaTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const t = Math.max(0, sec);
  const s = Math.floor(t % 60);
  const m = Math.floor(t / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

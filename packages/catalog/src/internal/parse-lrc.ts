/** Matches legacy NCE player offset in main.js (LRCParser). */
export const NCE_LEGACY_SYNC_OFFSET = -0.5;

export type LrcLine = {
  time: number;
  english: string;
  chinese: string;
};

export type ParseLrcOptions = {
  /** Added to computed timestamp (seconds). Default 0. Use {@link NCE_LEGACY_SYNC_OFFSET} for old site parity. */
  syncOffsetSec?: number;
};

const WITH_FRAC = /^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)$/;
const NO_FRAC = /^\[(\d{2}):(\d{2})\]\s*(.*)$/;

function baseTimeSeconds(
  min: string,
  sec: string,
  frac: string | undefined,
): number {
  const minutes = parseInt(min, 10);
  const seconds = parseInt(sec, 10);
  const sub = frac === undefined ? 0 : parseInt(frac, 10) / 1000;
  return minutes * 60 + seconds + sub;
}

function splitLang(text: string): Pick<LrcLine, "english" | "chinese"> {
  const trimmed = text.trim();
  const parts = trimmed.split("|").map((p) => p.trim());
  return {
    english: parts[0] ?? "",
    chinese: parts[1] ?? "",
  };
}

export function parseLrc(text: string, options?: ParseLrcOptions): LrcLine[] {
  const offset = options?.syncOffsetSec ?? 0;
  const lines = text.split("\n");
  const out: LrcLine[] = [];

  for (const line of lines) {
    let m = line.match(WITH_FRAC);
    if (m) {
      const min = m[1];
      const sec = m[2];
      const frac = m[3];
      const rest = m[4] ?? "";
      if (min === undefined || sec === undefined || frac === undefined)
        continue;
      const base = baseTimeSeconds(min, sec, frac);
      const { english, chinese } = splitLang(rest);
      out.push({
        time: base + offset,
        english,
        chinese,
      });
      continue;
    }
    m = line.match(NO_FRAC);
    if (m) {
      const min = m[1];
      const sec = m[2];
      const rest = m[3] ?? "";
      if (min === undefined || sec === undefined) continue;
      const base = baseTimeSeconds(min, sec, undefined);
      const { english, chinese } = splitLang(rest);
      out.push({
        time: base + offset,
        english,
        chinese,
      });
    }
  }

  return out.sort((a, b) => a.time - b.time);
}

/**
 * Index of the line to highlight: last line with time <= timeSec.
 * Returns -1 if no line applies (empty or timeSec before first line).
 */
export function findActiveLineIndex(
  lines: readonly LrcLine[],
  timeSec: number,
): number {
  if (lines.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.time <= timeSec) idx = i;
    else break;
  }
  return idx;
}

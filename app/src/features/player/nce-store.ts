import catalog, { type LyricLine } from "@nce/catalog";
import player, {
  type PlayerPreferences,
  type TrackPlayMode,
  type TranslationMode,
} from "@nce/player";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { logMediaInfo, logMediaWarn } from "../../lib/client-media-log.ts";

export type NceSessionState = {
  bookKey: string | null;
  unitIndex: number;
  trackPlayMode: TrackPlayMode;
  playbackRate: number;
  translationMode: TranslationMode;
  /** When set, pause playback once time reaches the next line (or track end). Not persisted. */
  pauseAfterLineIndex: number | null;
  lyricLines: LyricLine[];
  lyricsStatus: "idle" | "loading" | "error" | "ready";
  lyricsError: string | null;
  setBook: (bookKey: string, preferredUnitIndex?: number) => void;
  setUnitIndex: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  /** Call when <audio> fires `ended`; returns how the UI should react. */
  onAudioEnded: () => { action: "replay" | "next" | "stop" };
  cyclePlaybackRate: () => void;
  cycleTrackPlayMode: () => void;
  cycleTranslationMode: () => void;
  loadLyricsForCurrentUnit: () => Promise<void>;
  setLyricLines: (lines: LyricLine[]) => void;
  applyPlayerPreferences: (p: PlayerPreferences) => void;
  armPauseAfterLine: (lineIndex: number) => void;
  clearPauseAfterLine: () => void;
};

function unitCountForBook(bookKey: string | null): number {
  if (!bookKey) return 0;
  return catalog.listUnits(bookKey).length;
}

export const useNceStore = create<NceSessionState>()(
  persist(
    (set, get) => ({
      bookKey: null,
      unitIndex: 0,
      trackPlayMode: player.DEFAULT_PLAYER_PREFERENCES.trackPlayMode,
      playbackRate: player.DEFAULT_PLAYER_PREFERENCES.playbackRate,
      translationMode: player.DEFAULT_PLAYER_PREFERENCES.translationMode,
      pauseAfterLineIndex: null,
      lyricLines: [],
      lyricsStatus: "idle" as const,
      lyricsError: null,

      armPauseAfterLine: (lineIndex: number) => {
        set({ pauseAfterLineIndex: lineIndex });
      },

      clearPauseAfterLine: () => {
        set({ pauseAfterLineIndex: null });
      },

      setBook: (bookKey: string, preferredUnitIndex?: number) => {
        const book = catalog.getBook(bookKey);
        if (!book) return;
        const n = book.units.length;
        const raw = preferredUnitIndex ?? 0;
        const unitIndex = n > 0 ? Math.min(Math.max(raw, 0), n - 1) : 0;
        set({
          bookKey,
          unitIndex,
          pauseAfterLineIndex: null,
          lyricLines: [],
          lyricsStatus: "idle",
          lyricsError: null,
        });
      },

      setUnitIndex: (index: number) => {
        const { bookKey } = get();
        const n = unitCountForBook(bookKey);
        if (n <= 0 || index < 0 || index >= n) return;
        set({
          unitIndex: index,
          pauseAfterLineIndex: null,
          lyricLines: [],
          lyricsStatus: "idle",
          lyricsError: null,
        });
      },

      goNext: () => {
        const { bookKey, unitIndex } = get();
        const n = unitCountForBook(bookKey);
        if (!bookKey || !player.canNext(unitIndex, n)) return;
        set({
          unitIndex: player.nextUnitIndex(unitIndex, n),
          pauseAfterLineIndex: null,
          lyricLines: [],
          lyricsStatus: "idle",
          lyricsError: null,
        });
      },

      goPrev: () => {
        const { bookKey, unitIndex } = get();
        if (!bookKey || !player.canPrev(unitIndex)) return;
        set({
          unitIndex: player.prevUnitIndex(unitIndex),
          pauseAfterLineIndex: null,
          lyricLines: [],
          lyricsStatus: "idle",
          lyricsError: null,
        });
      },

      onAudioEnded: () => {
        const { bookKey, unitIndex, trackPlayMode } = get();
        const n = unitCountForBook(bookKey);
        const res = player.resolveAfterTrackEnded({
          mode: trackPlayMode,
          unitIndex,
          unitCount: n,
        });
        if (res.action === "next") {
          get().goNext();
        }
        return res;
      },

      cyclePlaybackRate: () => {
        set((s) => ({
          playbackRate: player.cyclePlaybackRate(s.playbackRate),
        }));
      },

      cycleTrackPlayMode: () => {
        set((s) => ({
          trackPlayMode:
            s.trackPlayMode === "sequential" ? "repeatOne" : "sequential",
        }));
      },

      cycleTranslationMode: () => {
        set((s) => ({
          translationMode: player.cycleTranslationMode(s.translationMode),
        }));
      },

      loadLyricsForCurrentUnit: async () => {
        const { bookKey, unitIndex } = get();
        if (!bookKey) {
          set({ lyricsStatus: "error", lyricsError: "No book selected" });
          return;
        }
        const units = catalog.listUnits(bookKey);
        const u = units[unitIndex];
        if (!u) {
          set({ lyricsStatus: "error", lyricsError: "Invalid unit" });
          return;
        }
        set({ lyricsStatus: "loading", lyricsError: null });
        const { lrcUrl } = catalog.getUnitMedia(bookKey, u.entry);
        try {
          logMediaInfo("lrc.fetch", { bookKey, unit: u.entry, lrcUrl });
          const res = await fetch(lrcUrl);
          if (!res.ok) {
            logMediaWarn("lrc.fetch_failed", {
              bookKey,
              unit: u.entry,
              lrcUrl,
              status: res.status,
              statusText: res.statusText,
              hint: "If 404, compare lrcUrl path to actual R2 object keys (mirrorRoot + unit + .lrc)",
            });
            throw new Error(`LRC HTTP ${res.status}`);
          }
          const text = await res.text();
          const lines = catalog.parseLyrics(text, { useLegacySyncOffset: true });
          logMediaInfo("lrc.parsed", {
            bookKey,
            unit: u.entry,
            lineCount: lines.length,
          });
          set({
            lyricLines: lines,
            lyricsStatus: "ready",
            lyricsError: null,
            pauseAfterLineIndex: null,
          });
        } catch (e) {
          const raw = e instanceof Error ? e.message : "Failed to load lyrics";
          const likelyCors =
            raw === "Failed to fetch" ||
            raw.includes("NetworkError") ||
            raw.includes("Load failed");
          const message = likelyCors
            ? "Lyrics blocked by CORS: add Access-Control-Allow-Origin on your R2 bucket (or CDN) for this site’s origin."
            : raw;
          logMediaWarn("lrc.error", {
            bookKey,
            unit: u.entry,
            lrcUrl,
            message,
            ...(likelyCors && {
              hint: "<audio> MP3 can work without CORS; fetch() for .lrc cannot. See app/README.md → CORS for .lrc.",
            }),
          });
          set({
            lyricLines: [],
            lyricsStatus: "error",
            lyricsError: message,
            pauseAfterLineIndex: null,
          });
        }
      },

      setLyricLines: (lines: LyricLine[]) => {
        set({ lyricLines: lines });
      },

      applyPlayerPreferences: (p: PlayerPreferences) => {
        set({
          trackPlayMode: p.trackPlayMode,
          playbackRate: p.playbackRate,
          translationMode: p.translationMode,
        });
      },
    }),
    {
      name: "nce:app-session",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        bookKey: s.bookKey,
        unitIndex: s.unitIndex,
        trackPlayMode: s.trackPlayMode,
        playbackRate: s.playbackRate,
        translationMode: s.translationMode,
      }),
    },
  ),
);

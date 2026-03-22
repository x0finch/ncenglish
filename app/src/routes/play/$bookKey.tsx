import catalog from "@nce/catalog";
import type { LyricLine } from "@nce/catalog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ChevronUp,
  ListMusic,
  Pause,
  Play,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { BookCoverArt } from "../../components/book-cover-art.tsx";
import { cn } from "#/lib/utils.ts";
import {
  PlayerTransportControls,
  type PlayerTransportControlsProps,
} from "../../features/player/player-transport.tsx";
import { useNceStore } from "../../features/player/nce-store.ts";
import { logMediaInfo, logMediaWarn } from "../../lib/client-media-log.ts";

export const Route = createFileRoute("/play/$bookKey")({
  validateSearch: (raw: Record<string, unknown>) => {
    const u = raw.unit;
    const n = u != null ? Number(u) : undefined;
    return {
      unit: n != null && Number.isFinite(n) ? n : undefined,
    };
  },
  component: PlayPage,
});

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Second click on the same lyric line within this window arms pause-at-end-of-line. */
const LYRIC_DOUBLE_CLICK_MS = 450;

function PlayPage() {
  const { bookKey } = Route.useParams();
  const { unit: unitFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mediaTime, setMediaTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);

  const unitIndex = useNceStore((s) => s.unitIndex);
  const trackPlayMode = useNceStore((s) => s.trackPlayMode);
  const playbackRate = useNceStore((s) => s.playbackRate);
  const translationMode = useNceStore((s) => s.translationMode);
  const lyricLines = useNceStore((s) => s.lyricLines);
  const lyricsStatus = useNceStore((s) => s.lyricsStatus);
  const lyricsError = useNceStore((s) => s.lyricsError);

  const setUnitIndex = useNceStore((s) => s.setUnitIndex);
  const goNext = useNceStore((s) => s.goNext);
  const goPrev = useNceStore((s) => s.goPrev);
  const onAudioEnded = useNceStore((s) => s.onAudioEnded);
  const loadLyricsForCurrentUnit = useNceStore(
    (s) => s.loadLyricsForCurrentUnit,
  );
  const cyclePlaybackRate = useNceStore((s) => s.cyclePlaybackRate);
  const cycleTrackPlayMode = useNceStore((s) => s.cycleTrackPlayMode);
  const cycleTranslationMode = useNceStore((s) => s.cycleTranslationMode);
  const armPauseAfterLine = useNceStore((s) => s.armPauseAfterLine);
  const clearPauseAfterLine = useNceStore((s) => s.clearPauseAfterLine);

  const [expanded, setExpanded] = useState(false);
  const lyricDoubleClickRef = useRef<{ lineIndex: number; t: number } | null>(
    null,
  );

  /** Suppress immediate scroll-into-view after lyric taps so a second tap hits the same row. */
  const lyricScrollGateRef = useRef<{
    suppressUntil: number;
    deferredId: ReturnType<typeof setTimeout> | null;
  }>({ suppressUntil: 0, deferredId: null });

  const bumpLyricClickScrollGate = useCallback(() => {
    const g = lyricScrollGateRef.current;
    if (g.deferredId != null) {
      clearTimeout(g.deferredId);
      g.deferredId = null;
    }
    g.suppressUntil = Date.now() + LYRIC_DOUBLE_CLICK_MS;
    g.deferredId = setTimeout(() => {
      g.deferredId = null;
      g.suppressUntil = 0;
      const a = audioRef.current;
      const lines = useNceStore.getState().lyricLines;
      const t = a?.currentTime ?? 0;
      const idx = catalog.activeLyricIndex(lines, t);
      const row = document.getElementById(`lyric-line-${idx}`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, LYRIC_DOUBLE_CLICK_MS);
  }, []);

  useEffect(() => {
    return () => {
      const g = lyricScrollGateRef.current;
      if (g.deferredId != null) clearTimeout(g.deferredId);
    };
  }, []);

  useEffect(() => {
    useNceStore.getState().setBook(bookKey, unitFromUrl);
  }, [bookKey, unitFromUrl]);

  useEffect(() => {
    const idx = useNceStore.getState().unitIndex;
    void navigate({
      to: "/play/$bookKey",
      params: { bookKey },
      search: { unit: idx },
      replace: true,
    });
  }, [bookKey, unitIndex, navigate]);

  useEffect(() => {
    void loadLyricsForCurrentUnit();
  }, [bookKey, unitIndex, loadLyricsForCurrentUnit]);

  const bindAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const book = catalog.getBook(bookKey);
    if (!book) {
      logMediaWarn("audio.skip_no_book", { bookKey });
      return;
    }
    const units = catalog.listUnits(bookKey);
    const u = units[unitIndex];
    if (!u) {
      logMediaWarn("audio.skip_no_unit", { bookKey, unitIndex });
      return;
    }
    try {
      const { audioUrl } = catalog.getUnitMedia(bookKey, u.entry);
      logMediaInfo("audio.set_src", {
        bookKey,
        unit: u.entry,
        audioUrl,
        playbackRate,
      });
      if (el.src !== audioUrl) {
        el.src = audioUrl;
        const { suppressAutoplay } = useNceStore.getState();
        if (suppressAutoplay !== true) {
          void el.play().catch((err) => {
            logMediaWarn("audio.play_rejected", {
              audioUrl,
              message: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
      el.playbackRate = playbackRate;
    } catch (e) {
      logMediaWarn("audio.getUnitMedia_failed", {
        bookKey,
        unit: u.entry,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [bookKey, unitIndex, playbackRate]);

  useEffect(() => {
    bindAudio();
  }, [bindAudio]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onError = () => {
      const err = el.error;
      logMediaWarn("audio.element_error", {
        src: el.currentSrc || el.src,
        code: err?.code,
        message: err?.message,
        hint: "MEDIA_ERR_SRC_NOT_SUPPORTED(4) often means 404, CORS, or wrong Content-Type from the media host",
      });
    };
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [bookKey, unitIndex]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const sync = () => setPaused(el.paused);
    sync();
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
    };
  }, [bookKey, unitIndex]);

  const activeLyric = catalog.activeLyricIndex(lyricLines, mediaTime);

  useEffect(() => {
    if (Date.now() < lyricScrollGateRef.current.suppressUntil) {
      return;
    }
    const el = document.getElementById(`lyric-line-${activeLyric}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLyric]);

  const selectUnit = (idx: number) => {
    setUnitIndex(idx);
  };

  const onEnded = () => {
    const res = onAudioEnded();
    const el = audioRef.current;
    if (!el) return;
    if (res.action === "replay") {
      el.currentTime = 0;
      void el.play();
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    const st = useNceStore.getState();
    if (el.paused) {
      st.setSuppressAutoplay(false);
      void el.play();
    } else {
      st.setSuppressAutoplay(true);
      el.pause();
    }
  };

  const seekAudio = useCallback((t: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = t;
  }, []);

  const onSeekFromScrubber = useCallback(
    (t: number) => {
      clearPauseAfterLine();
      seekAudio(t);
    },
    [clearPauseAfterLine, seekAudio],
  );

  const handleLyricLineClick = useCallback(
    (lineIndex: number, timeSec: number) => {
      bumpLyricClickScrollGate();

      const now = Date.now();
      const prev = lyricDoubleClickRef.current;
      const isDouble =
        prev != null &&
        prev.lineIndex === lineIndex &&
        now - prev.t < LYRIC_DOUBLE_CLICK_MS;

      if (isDouble) {
        lyricDoubleClickRef.current = null;
        seekAudio(timeSec);
        armPauseAfterLine(lineIndex);
        const a = audioRef.current;
        if (a?.paused) {
          useNceStore.getState().setSuppressAutoplay(false);
          void a.play();
        }
        return;
      }

      lyricDoubleClickRef.current = { lineIndex, t: now };
      const armed = useNceStore.getState().pauseAfterLineIndex;
      if (armed != null && armed !== lineIndex) {
        clearPauseAfterLine();
      }
      seekAudio(timeSec);
      const a = audioRef.current;
      if (a?.paused) {
        useNceStore.getState().setSuppressAutoplay(false);
        void a.play();
      }
    },
    [armPauseAfterLine, bumpLyricClickScrollGate, clearPauseAfterLine, seekAudio],
  );

  const onAudioTimeUpdate = useCallback((e: SyntheticEvent<HTMLAudioElement>) => {
    const el = e.currentTarget;
    const t = el.currentTime;
    setMediaTime(t);

    const st = useNceStore.getState();
    const idx = st.pauseAfterLineIndex;
    if (idx == null) return;
    const lines = st.lyricLines;
    if (idx < 0 || idx >= lines.length) {
      st.clearPauseAfterLine();
      return;
    }
    const dur = el.duration;
    const lineStart = lines[idx].timeSec;
    const nextStart = lines[idx + 1]?.timeSec;
    const boundary =
      nextStart !== undefined && Number.isFinite(nextStart)
        ? nextStart
        : Number.isFinite(dur)
          ? dur
          : null;
    if (boundary == null) return;
    if (t >= boundary - 0.05) {
      // Snap just before the next line so activeLyric stays on this line after pause.
      let snap: number;
      if (nextStart !== undefined && Number.isFinite(nextStart)) {
        const beforeNext = nextStart - 0.08;
        if (beforeNext > lineStart) {
          snap = Math.min(beforeNext, el.duration);
        } else {
          snap = Math.min(lineStart + (nextStart - lineStart) * 0.5, el.duration);
        }
      } else if (Number.isFinite(dur)) {
        snap = Math.max(lineStart, Math.min(dur - 0.06, el.duration));
      } else {
        snap = t;
      }
      el.currentTime = snap;
      setMediaTime(snap);
      el.pause();
      st.clearPauseAfterLine();
    }
  }, []);

  const book = catalog.getBook(bookKey);
  const units = book ? catalog.listUnits(bookKey) : [];
  const currentTitle =
    units[unitIndex]?.entry.replace(/\.[^.]+$/, "") ?? "—";

  let coverUrl: string | null = null;
  try {
    coverUrl = catalog.getBookCoverUrl(bookKey);
  } catch {
    coverUrl = null;
  }

  const transportProps = {
    mediaTime,
    duration,
    onSeek: onSeekFromScrubber,
    paused,
    onTogglePlay: togglePlay,
    onPrev: goPrev,
    onNext: goNext,
    playbackRate,
    onCyclePlaybackRate: cyclePlaybackRate,
    trackPlayMode,
    onCycleTrackPlayMode: cycleTrackPlayMode,
    onCycleTranslationMode: cycleTranslationMode,
    translationMode,
    nowPlayingTitle: currentTitle,
    bookTitle: book?.title ?? "",
    coverUrl,
  };

  const bottomPad =
    "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-[calc(10.5rem+env(safe-area-inset-bottom))]";

  return (
    <main
      className={`flex min-h-0 flex-1 flex-col px-4 pt-4 ${bottomPad} md:h-[calc(100dvh-var(--app-header-height))] md:max-h-[calc(100dvh-var(--app-header-height))] md:flex-none md:overflow-hidden`}
    >
      <audio
        ref={audioRef}
        className="hidden"
        controls={false}
        onTimeUpdate={onAudioTimeUpdate}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={onEnded}
      />

      <div
        className="nce-page-wrap flex min-h-0 flex-1 flex-col gap-4 md:max-w-[1600px] md:min-h-0 md:flex-1 md:grid md:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] md:gap-6 md:overflow-hidden"
      >
        <aside className="flex min-h-0 flex-col md:min-h-0 md:overflow-hidden md:border-r md:border-[var(--line)] md:pr-4">
          <div className="flex min-h-[22vh] flex-1 flex-col md:min-h-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--kicker)]">
              Lessons
            </h2>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
              {units.map((u) => (
                <li key={u.entry}>
                  <button
                    type="button"
                    onClick={() => selectUnit(u.index)}
                    className={
                      u.index === unitIndex
                        ? "w-full rounded-lg border border-[var(--lagoon-deep)] bg-[color-mix(in_oklab,var(--lagoon)_18%,transparent)] px-3 py-2.5 text-left text-sm font-medium"
                        : "w-full rounded-lg border border-transparent px-3 py-2.5 text-left text-sm opacity-90 hover:bg-[var(--surface-strong)]"
                    }
                  >
                    {u.entry}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:min-h-0 md:p-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:p-5">
            <LyricsColumn
              lyricsStatus={lyricsStatus}
              lyricsError={lyricsError}
              lyricLines={lyricLines}
              activeLyric={activeLyric}
              translationMode={translationMode}
              onLyricLineClick={handleLyricLineClick}
            />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-[var(--line)] bg-[var(--header-bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:block">
        <div className="nce-page-wrap mx-auto max-w-[1600px] px-4 py-3">
          <PlayerTransportControls {...transportProps} />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[var(--line)] bg-[var(--header-bg)]/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded(true)}
          aria-label="Open full player controls"
        >
          <BookCoverArt src={coverUrl} variant="transportMini" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentTitle}</p>
            <p className="truncate text-xs opacity-60">{book?.title}</p>
          </div>
          <ChevronUp className="size-5 shrink-0 opacity-50" aria-hidden />
        </button>
        <Button
          type="button"
          size="icon-sm"
          onClick={togglePlay}
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? (
            <Play className="size-4" fill="currentColor" aria-hidden />
          ) : (
            <Pause className="size-4" aria-hidden />
          )}
        </Button>
      </div>

      <MobileExpandedPlayer
        open={expanded}
        onOpenChange={setExpanded}
        transportProps={transportProps}
        currentTitle={currentTitle}
        bookTitle={book?.title ?? ""}
        coverUrl={coverUrl}
      />
    </main>
  );
}

/** Portal + fixed position (below-left of trigger) so overflow-hidden does not clip. */
function LyricsInteractionTips() {
  const tipsId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [tipStyle, setTipStyle] = useState<CSSProperties>({});

  const layout = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const maxW = Math.min(19 * 16, vw - 16);
    // Bottom-left of trigger: below the button, left edge aligned with the button.
    let left = r.left;
    left = Math.min(left, vw - maxW - 8);
    left = Math.max(8, left);
    setTipStyle({
      position: "fixed",
      left,
      top: r.bottom + 8,
      width: maxW,
      zIndex: 10050,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    layout();
    const ro = new ResizeObserver(() => layout());
    const t = btnRef.current;
    if (t) ro.observe(t);
    window.addEventListener("scroll", layout, true);
    window.addEventListener("resize", layout);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", layout, true);
      window.removeEventListener("resize", layout);
    };
  }, [open, layout]);

  const tooltip = (
    <div
      id={tipsId}
      role="tooltip"
      style={tipStyle}
      className="pointer-events-none rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-left text-xs leading-snug text-[var(--sea-ink-soft)] shadow-lg"
    >
      <p className="mb-2 font-semibold text-[var(--sea-ink)]">Tips</p>
      <ul className="list-disc space-y-1.5 pl-4">
        <li>
          <span className="font-semibold text-[var(--sea-ink)]">Click</span> a
          line to jump there and play. If audio is paused, playback starts.
        </li>
        <li>
          <span className="font-semibold text-[var(--sea-ink)]">
            Double-click
          </span>{" "}
          the same line quickly to pause automatically when that line ends.
        </li>
      </ul>
    </div>
  );

  return (
    <div className="shrink-0 pt-0.5">
      <button
        ref={btnRef}
        type="button"
        className="rounded-md p-1 text-[var(--sea-ink-soft)] transition-colors hover:bg-[color-mix(in_oklab,var(--lagoon)_10%,transparent)] hover:text-[var(--lagoon-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--lagoon-deep)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foam)]"
        aria-label="Lyrics interaction tips"
        aria-describedby={tipsId}
        onMouseEnter={() => {
          layout();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          layout();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      >
        <AlertCircle
          className="size-[1.125rem] shrink-0"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(tooltip, document.body)
        : null}
    </div>
  );
}

function LyricsColumn({
  lyricsStatus,
  lyricsError,
  lyricLines,
  activeLyric,
  translationMode,
  onLyricLineClick,
}: {
  lyricsStatus: "idle" | "loading" | "error" | "ready";
  lyricsError: string | null;
  lyricLines: readonly LyricLine[];
  activeLyric: number;
  translationMode: "show" | "hide" | "blur";
  onLyricLineClick: (lineIndex: number, timeSec: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--kicker)]">
          <ListMusic className="size-4 shrink-0 opacity-80" aria-hidden />
          Line by line
        </h2>
        {lyricsStatus === "ready" && lyricLines.length > 0 ? (
          <LyricsInteractionTips />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {lyricsStatus === "loading" && (
          <p className="text-sm opacity-70">Loading lyrics…</p>
        )}
        {lyricsStatus === "error" && (
          <p className="text-sm text-red-600/90">{lyricsError}</p>
        )}
        {lyricsStatus === "ready" && lyricLines.length === 0 && (
          <p className="text-sm opacity-70">No lyric lines.</p>
        )}
        <ul className="list-none space-y-2 p-0">
          {lyricLines.map((line, i) => (
            <li
              key={`${line.timeSec}-${line.english.slice(0, 24)}`}
              id={`lyric-line-${i}`}
            >
              <button
                type="button"
                onClick={() => onLyricLineClick(i, line.timeSec)}
                className={cn(
                  "w-full cursor-pointer rounded-lg border border-transparent bg-transparent px-1 py-1.5 text-left font-[inherit] transition hover:bg-[color-mix(in_oklab,var(--lagoon)_10%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--lagoon-deep)_35%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--foam)] touch-manipulation",
                  i === activeLyric
                    ? "font-semibold text-[var(--lagoon-deep)]"
                    : "opacity-80",
                )}
                aria-label={`Seek to ${formatTime(line.timeSec)}: ${line.english.slice(0, 120)}. Double-click the same line to pause when it ends.`}
                title="Double-click this line (twice quickly) to pause when this line ends."
              >
                <span className="text-xs opacity-50 tabular-nums">
                  {formatTime(line.timeSec)}
                </span>
                {translationMode === "blur" ? (
                  <div className="blur-sm transition hover:blur-none">
                    <div>{line.english}</div>
                    {line.chinese ? (
                      <div className="mt-0.5 text-sm opacity-75">
                        {line.chinese}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div>{line.english}</div>
                    {translationMode !== "hide" && line.chinese ? (
                      <div className="mt-0.5 text-sm opacity-75">
                        {line.chinese}
                      </div>
                    ) : null}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileExpandedPlayer({
  open,
  onOpenChange,
  transportProps,
  currentTitle,
  bookTitle,
  coverUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transportProps: PlayerTransportControlsProps;
  currentTitle: string;
  bookTitle: string;
  coverUrl: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="top-auto bottom-0 left-1/2 max-h-[min(92dvh,100%)] w-full max-w-full translate-x-[-50%] translate-y-0 gap-4 overflow-y-auto rounded-t-xl rounded-b-none border-x-0 sm:max-w-full"
      >
        <DialogHeader>
          <DialogTitle>{currentTitle}</DialogTitle>
          <DialogDescription>{bookTitle}</DialogDescription>
        </DialogHeader>
        <BookCoverArt src={coverUrl} variant="dialog" />
        <PlayerTransportControls {...transportProps} showTrackInfo={false} />
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

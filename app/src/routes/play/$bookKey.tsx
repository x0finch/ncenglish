import catalog from "@nce/catalog";
import type { LyricLine } from "@nce/catalog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ListMusic } from "lucide-react";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "#/components/ui/drawer.tsx";
import { formatMediaTime } from "#/lib/format-media-time.ts";
import { cn } from "#/lib/utils.ts";
import { PlayerTransportControls } from "../../features/player/player-transport.tsx";
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

  const [lessonsDrawerOpen, setLessonsDrawerOpen] = useState(false);
  const drawerSelectedLessonRef = useRef<HTMLButtonElement | null>(null);
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

  useEffect(() => {
    if (!lessonsDrawerOpen) return;
    const scrollToSelected = () => {
      drawerSelectedLessonRef.current?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "auto",
      });
    };
    const t0 = window.setTimeout(scrollToSelected, 0);
    const t1 = window.setTimeout(scrollToSelected, 120);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, [lessonsDrawerOpen, unitIndex]);

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
    if (!el) return;
    const clamped = Number.isFinite(t) ? Math.max(0, t) : 0;
    el.currentTime = clamped;
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

  /* Reserve space for fixed transport; mobile adds extra above Safari toolbar (beyond safe-area). */
  const bottomPad =
    "pb-[calc(7.75rem+env(safe-area-inset-bottom))] md:pb-[calc(8.75rem+env(safe-area-inset-bottom))]";

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
      <main
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pt-2 ${bottomPad} md:px-4 md:pt-4`}
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
          className="nce-page-wrap grid min-h-0 w-full min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-2 overflow-hidden md:max-w-[1600px] md:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] md:grid-rows-1 md:gap-6"
        >
        <aside className="flex shrink-0 flex-col md:h-full md:min-h-0 md:shrink md:overflow-hidden md:border-r md:border-border md:pr-4">
          {/* Narrow screens: bottom drawer for lesson list */}
          <div className="md:hidden">
            <h2 className="mb-1 pl-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lessons
            </h2>
            {units.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
                No lessons.
              </p>
            ) : (
              <Drawer open={lessonsDrawerOpen} onOpenChange={setLessonsDrawerOpen}>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-left text-sm text-foreground shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-expanded={lessonsDrawerOpen}
                    aria-haspopup="dialog"
                  >
                    <span className="min-w-0 truncate">
                      {units[unitIndex]?.entry ?? currentTitle}
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground opacity-70"
                      aria-hidden
                    />
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader className="gap-0 px-4 py-2 text-left">
                    <DrawerTitle className="text-sm font-semibold leading-tight">
                      Lessons
                    </DrawerTitle>
                  </DrawerHeader>
                  <div className="max-h-[min(60dvh,28rem)] overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <ul className="space-y-1">
                      {units.map((u) => (
                        <li key={u.entry}>
                          <button
                            ref={
                              u.index === unitIndex
                                ? drawerSelectedLessonRef
                                : undefined
                            }
                            type="button"
                            onClick={() => {
                              selectUnit(u.index);
                              setLessonsDrawerOpen(false);
                            }}
                            className={
                              u.index === unitIndex
                                ? "w-full rounded-lg border border-primary bg-primary/15 px-3 py-2.5 text-left text-sm font-medium"
                                : "w-full rounded-lg border border-transparent px-3 py-2.5 text-left text-sm opacity-90 hover:bg-muted"
                            }
                          >
                            {u.entry}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </DrawerContent>
              </Drawer>
            )}
          </div>

          <div className="hidden min-h-0 flex-1 flex-col md:flex md:overflow-hidden">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lessons
            </h2>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-1">
              {units.map((u) => (
                <li key={u.entry}>
                  <button
                    type="button"
                    onClick={() => selectUnit(u.index)}
                    className={
                      u.index === unitIndex
                        ? "w-full rounded-lg border border-primary bg-primary/15 px-3 py-2.5 text-left text-sm font-medium"
                        : "w-full rounded-lg border border-transparent px-3 py-2.5 text-left text-sm opacity-90 hover:bg-muted"
                    }
                  >
                    {u.entry}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-0 md:h-full md:min-h-0 md:rounded-2xl">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:h-full md:p-6">
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
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden md:block">
        <div className="pointer-events-auto border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
          <div className="nce-page-wrap max-w-[1600px] px-4 py-3">
            <PlayerTransportControls {...transportProps} />
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="pointer-events-auto border-t border-border bg-background pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="max-h-[min(45dvh,14rem)] overflow-y-auto overscroll-contain px-2 py-1.5">
            <PlayerTransportControls {...transportProps} dock />
          </div>
        </div>
      </div>
    </div>
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
      className="pointer-events-none rounded-lg border border-border bg-popover p-3 text-left text-xs leading-snug text-popover-foreground shadow-lg"
    >
      <p className="mb-2 font-semibold text-foreground">Tips</p>
      <ul className="list-disc space-y-1.5 pl-4">
        <li>
          <span className="font-semibold text-foreground">Click</span> a
          line to jump there and play. If audio is paused, playback starts.
        </li>
        <li>
          <span className="font-semibold text-foreground">
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
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          className="size-4.5 shrink-0"
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

const lyricBlurClass = "blur-sm transition hover:blur-none";

function lineHasChinese(line: LyricLine): boolean {
  return line.chinese.trim().length > 0;
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
      <div className="mb-1 flex shrink-0 items-start justify-between gap-2 px-3 pt-3 md:mb-2 md:px-0 md:pt-0">
        <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground md:gap-2">
          <ListMusic className="size-4 shrink-0 opacity-80" aria-hidden />
          Lyrics
        </h2>
        {lyricsStatus === "ready" && lyricLines.length > 0 ? (
          <LyricsInteractionTips />
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-10 pt-0.5 md:px-0 md:pb-4 md:pt-0 md:pr-2">
        {lyricsStatus === "loading" && (
          <p className="text-sm opacity-70">Loading lyrics…</p>
        )}
        {lyricsStatus === "error" && (
          <p className="text-sm text-destructive">{lyricsError}</p>
        )}
        {lyricsStatus === "ready" && lyricLines.length === 0 && (
          <p className="text-sm opacity-70">No lyric lines.</p>
        )}
        <ul className="list-none space-y-1 p-0 md:space-y-1.5">
          {lyricLines.map((line, i) => {
            const hasCn = lineHasChinese(line);
            const isActive = activeLyric >= 0 && i === activeLyric;
            /** show: only active line has clear Chinese; hide: all Chinese blurred; blur: whole-line wrapper only */
            const blurChineseOnly =
              translationMode !== "blur" &&
              hasCn &&
              (translationMode === "hide" ||
                (translationMode === "show" && !isActive));
            const blurWholeLine = translationMode === "blur";

            const textBlock = (
              <>
                <div>{line.english}</div>
                {hasCn ? (
                  <div
                    className={cn(
                      "mt-0.5 text-sm opacity-75",
                      blurChineseOnly && lyricBlurClass,
                    )}
                  >
                    {line.chinese}
                  </div>
                ) : null}
              </>
            );

            return (
              <li
                key={`${line.timeSec}-${line.english.slice(0, 24)}`}
                id={`lyric-line-${i}`}
              >
                <button
                  type="button"
                  onClick={() => onLyricLineClick(i, line.timeSec)}
                  className={cn(
                    "w-full cursor-pointer rounded-lg border px-2 py-2 text-left font-[inherit] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background touch-manipulation md:px-3 md:py-2.5",
                    i === activeLyric
                      ? "border-transparent bg-primary/15 font-semibold text-primary shadow-sm"
                      : "border-transparent bg-transparent opacity-80 hover:bg-accent",
                  )}
                  aria-label={`Seek to ${formatMediaTime(line.timeSec)}: ${line.english.slice(0, 120)}. Double-click the same line to pause when it ends.`}
                  title="Double-click this line (twice quickly) to pause when this line ends."
                >
                  <span className="text-xs opacity-50 tabular-nums">
                    {formatMediaTime(line.timeSec)}
                  </span>
                  {blurWholeLine ? (
                    <div className={lyricBlurClass}>{textBlock}</div>
                  ) : (
                    textBlock
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}


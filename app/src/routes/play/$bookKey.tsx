import catalog from "@nce/catalog";
import type { LyricLine } from "@nce/catalog";
import type { TrackPlayMode, TranslationMode } from "@nce/player";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListMusic, MousePointerClick, Timer } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SyntheticEvent,
} from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "#/components/ui/sidebar.tsx";
import { useIsMobile } from "#/hooks/use-mobile.ts";
import { formatMediaTime } from "#/lib/format-media-time.ts";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";
import {
  PlayerTransportControls,
  TransportExtraCluster,
} from "../../features/player/player-transport.tsx";
import {
  useNceStore,
  type LyricClickMode,
} from "../../features/player/nce-store.ts";
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

/** Strip only real audio extensions; lesson names like `001&002.Excuse Me` must stay intact. */
const AUDIO_FILE_EXT = /\.(aac|flac|m4a|mp3|ogg|opus|wav|wma)$/i;

function lessonDisplayName(entry: string | undefined): string {
  if (!entry?.trim()) return "—";
  const s = entry.replace(AUDIO_FILE_EXT, "").trim();
  return s || "—";
}

function PlayPage() {
  const isMobile = useIsMobile();
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
  const lyricClickMode = useNceStore((s) => s.lyricClickMode);
  const cycleLyricClickMode = useNceStore((s) => s.cycleLyricClickMode);
  const armPauseAfterLine = useNceStore((s) => s.armPauseAfterLine);
  const clearPauseAfterLine = useNceStore((s) => s.clearPauseAfterLine);

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
      const mode = useNceStore.getState().lyricClickMode;
      if (mode === "jumpOnly") {
        clearPauseAfterLine();
        const el = audioRef.current;
        seekAudio(timeSec);
        // Seek-only: no pause-at-line-end; always start or resume playback after seek.
        if (el) {
          useNceStore.getState().setSuppressAutoplay(false);
          void el.play();
        }
        return;
      }
      seekAudio(timeSec);
      armPauseAfterLine(lineIndex);
      const a = audioRef.current;
      if (a?.paused) {
        useNceStore.getState().setSuppressAutoplay(false);
        void a.play();
      }
    },
    [armPauseAfterLine, clearPauseAfterLine, seekAudio],
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
  const currentTitle = lessonDisplayName(units[unitIndex]?.entry);

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
    onPrev: trackPlayMode === "reverse" ? goNext : goPrev,
    onNext: trackPlayMode === "reverse" ? goPrev : goNext,
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

  return (
    <SidebarProvider className="flex min-h-0! w-full flex-1 flex-col">
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

      {/* Sidebar + inset must be siblings in a row so inset peer styles and widths work (Shadcn dashboard). */}
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-row overflow-hidden">
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border">
          <button
            type="button"
            onClick={() => void navigate({ to: "/library" })}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left ring-sidebar-ring outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
            aria-label="Back to library"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <ListMusic className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">
                {book?.title ?? "—"}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/70">
                {book?.bookLevel ? `${book.bookLevel} · ` : null}
                {units.length} lessons
              </p>
            </div>
          </button>
        </SidebarHeader>
        <SidebarContent>
          <PlayLessonMenu
            units={units}
            unitIndex={unitIndex}
            onSelectUnit={selectUnit}
          />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="max-w-none min-h-0 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)] md:pt-0">
          <div className="nce-page-wrap flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-3 md:max-w-[1600px] md:px-6">
            <LyricsColumn
              lessonTitle={currentTitle}
              lyricsStatus={lyricsStatus}
              lyricsError={lyricsError}
              lyricLines={lyricLines}
              activeLyric={activeLyric}
              translationMode={translationMode}
              playbackRate={playbackRate}
              onCyclePlaybackRate={cyclePlaybackRate}
              trackPlayMode={trackPlayMode}
              onCycleTrackPlayMode={cycleTrackPlayMode}
              onCycleTranslationMode={cycleTranslationMode}
              lyricClickMode={lyricClickMode}
              onCycleLyricClickMode={cycleLyricClickMode}
              onLyricLineClick={handleLyricLineClick}
            />
          </div>
          <div className="shrink-0 border-t border-border bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-4">
            <div className="nce-page-wrap mx-auto flex w-full max-w-[1600px] items-start gap-2">
              <SidebarTrigger className="shrink-0 md:hidden" />
              <div className="min-w-0 flex-1">
                <PlayerTransportControls
                  {...transportProps}
                  dock={isMobile}
                  showTrackInfo={false}
                  showExtraCluster={false}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

type PlayUnit = { index: number; entry: string };

function PlayLessonMenu({
  units,
  unitIndex,
  onSelectUnit,
}: {
  units: readonly PlayUnit[];
  unitIndex: number;
  onSelectUnit: (idx: number) => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Lessons</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {units.length === 0 ? (
            <SidebarMenuItem>
              <span className="block px-2 py-2 text-xs text-sidebar-foreground/70">
                No lessons.
              </span>
            </SidebarMenuItem>
          ) : (
            units.map((u) => (
              <SidebarMenuItem key={u.entry}>
                <SidebarMenuButton
                  isActive={u.index === unitIndex}
                  tooltip={u.entry}
                  onClick={() => {
                    onSelectUnit(u.index);
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <span className="truncate">{u.entry}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

const lyricBlurClass = "blur-sm transition hover:blur-none";

function LyricClickModeToggle({
  mode,
  onCycle,
}: {
  mode: LyricClickMode;
  onCycle: () => void;
}) {
  const seekOnly = mode === "jumpOnly";
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 max-w-full gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
      onClick={onCycle}
      title={
        seekOnly
          ? "Single tap: jump and play; does not pause at line end. Click to switch to play line then pause at line end."
          : "Single tap: jump, play, and pause when this line ends. Click to switch to seek only."
      }
      aria-label={
        seekOnly
          ? "Lyric tap mode: seek and play without pausing at line end. Click to switch to line-then-pause mode."
          : "Lyric tap mode: play this line then pause at line end. Click to switch to seek only."
      }
    >
      {seekOnly ? (
        <MousePointerClick className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Timer className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="text-[0.7rem] font-semibold">
        {seekOnly ? "Seek only" : "Line, then pause"}
      </span>
    </Button>
  );
}

function lineHasChinese(line: LyricLine): boolean {
  return line.chinese.trim().length > 0;
}

function LyricsColumn({
  lessonTitle,
  lyricsStatus,
  lyricsError,
  lyricLines,
  activeLyric,
  translationMode,
  playbackRate,
  onCyclePlaybackRate,
  trackPlayMode,
  onCycleTrackPlayMode,
  onCycleTranslationMode,
  lyricClickMode,
  onCycleLyricClickMode,
  onLyricLineClick,
}: {
  lessonTitle: string;
  lyricsStatus: "idle" | "loading" | "error" | "ready";
  lyricsError: string | null;
  lyricLines: readonly LyricLine[];
  activeLyric: number;
  translationMode: TranslationMode;
  playbackRate: number;
  onCyclePlaybackRate: () => void;
  trackPlayMode: TrackPlayMode;
  onCycleTrackPlayMode: () => void;
  onCycleTranslationMode: () => void;
  lyricClickMode: LyricClickMode;
  onCycleLyricClickMode: () => void;
  onLyricLineClick: (lineIndex: number, timeSec: number) => void;
}) {
  const lineTapHint =
    lyricClickMode === "jumpOnly"
      ? "Seek and play; does not pause after this line ends."
      : "Plays from this line and pauses when the line ends.";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-3 pt-0 md:px-0 md:pb-4">
        <h2 className="mx-auto max-w-2xl px-1 py-6 text-center text-lg font-semibold leading-snug tracking-tight text-pretty text-foreground md:py-6 md:text-xl">
          {lessonTitle}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <TransportExtraCluster
            playbackRate={playbackRate}
            onCyclePlaybackRate={onCyclePlaybackRate}
            trackPlayMode={trackPlayMode}
            onCycleTrackPlayMode={onCycleTrackPlayMode}
            onCycleTranslationMode={onCycleTranslationMode}
            translationMode={translationMode}
            className="justify-center"
          />
          <LyricClickModeToggle
            mode={lyricClickMode}
            onCycle={onCycleLyricClickMode}
          />
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-0 md:px-0 md:pb-4 md:pr-2">
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
            /** show: only active line has clear Chinese; hide: all Chinese blurred; blur: whole-line wrapper; clear: no blur */
            const blurChineseOnly =
              translationMode !== "blur" &&
              translationMode !== "clear" &&
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
                  aria-label={`Seek to ${formatMediaTime(line.timeSec)}: ${line.english.slice(0, 120)}. ${lineTapHint}`}
                  title={lineTapHint}
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


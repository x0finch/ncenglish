import type { TrackPlayMode, TranslationMode } from "@nce/player";
import {
  Eye,
  EyeClosed,
  Gauge,
  Globe,
  GlobeOff,
  ListOrdered,
  Pause,
  Play,
  Repeat1,
  SkipBack,
  SkipForward,
  SortDesc,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { BookCoverArt } from "#/components/book-cover-art.tsx";
import { Button } from "#/components/ui/button.tsx";
import { formatMediaTime } from "#/lib/format-media-time.ts";
import { cn } from "#/lib/utils.ts";

export type PlayerTransportControlsProps = {
  mediaTime: number;
  duration: number;
  onSeek: (timeSec: number) => void;
  paused: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  playbackRate: number;
  onCyclePlaybackRate: () => void;
  trackPlayMode: TrackPlayMode;
  onCycleTrackPlayMode: () => void;
  onCycleTranslationMode: () => void;
  translationMode: TranslationMode;
  /** Current lesson title (filename stem). */
  nowPlayingTitle: string;
  /** Book name for subtitle. */
  bookTitle?: string;
  coverUrl?: string | null;
  /** When false, hide artwork + titles (e.g. mobile sheet already shows them). Default true. */
  showTrackInfo?: boolean;
  /** When false, hide speed / repeat / translation controls (e.g. rendered above lyrics). Default true. */
  showExtraCluster?: boolean;
  /** Tighter layout: play + rate/repeat/translation on one row (fixed mobile dock). */
  dock?: boolean;
  /**
   * When `dock` is true and `showTrackInfo` is false, render in the play-cluster row on the
   * left; center column uses `1fr | auto | 1fr` so prev/play/next stay visually centered.
   */
  dockLeadingOverlay?: ReactNode;
};

function TransportPlayCluster({
  paused,
  onTogglePlay,
  onPrev,
  onNext,
  trackPlayMode,
  className,
}: {
  paused: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  trackPlayMode: TrackPlayMode;
  className?: string;
}) {
  /** Apple Music–style: circular skips with light typography-like strokes; large filled play circle. */
  const skipIconCls = "size-[1.0625rem] sm:size-[1.1875rem]";
  const skipStroke = 1.35;
  const reverse = trackPlayMode === "reverse";
  const prevLessonLabel = reverse
    ? "Later lesson in course"
    : "Previous lesson";
  const nextLessonLabel = reverse
    ? "Earlier lesson in course"
    : "Next lesson";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center gap-5 sm:gap-8",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className="size-10 rounded-full text-muted-foreground transition-[color,transform,background-color] hover:bg-muted/85 hover:text-foreground active:scale-[0.96] sm:size-11"
        onClick={onPrev}
        aria-label={prevLessonLabel}
      >
        <SkipBack
          className={skipIconCls}
          strokeWidth={skipStroke}
          aria-hidden
        />
      </Button>
      <Button
        type="button"
        variant="default"
        className="flex size-13 shrink-0 items-center justify-center rounded-full shadow-md transition-[transform,box-shadow] active:scale-[0.96] sm:size-16 sm:shadow-lg"
        onClick={onTogglePlay}
        aria-label={paused ? "Play" : "Pause"}
      >
        {paused ? (
          <Play
            className="size-4.75 translate-x-0.75 fill-current sm:size-6 sm:translate-x-0.5"
            strokeWidth={0}
            aria-hidden
          />
        ) : (
          <Pause
            className="size-4.75 sm:size-6"
            strokeWidth={2.35}
            aria-hidden
          />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="size-10 rounded-full text-muted-foreground transition-[color,transform,background-color] hover:bg-muted/85 hover:text-foreground active:scale-[0.96] sm:size-11"
        onClick={onNext}
        aria-label={nextLessonLabel}
      >
        <SkipForward
          className={skipIconCls}
          strokeWidth={skipStroke}
          aria-hidden
        />
      </Button>
    </div>
  );
}

function translationModeUi(mode: TranslationMode): {
  title: string;
  ariaLabel: string;
  shortLabel: string;
  icon: ReactNode;
  buttonClass: string;
} {
  switch (mode) {
    case "show":
      return {
        title:
          "Spotlight: sharp Chinese only on the line at the playhead; other lines stay soft (next: English-first)",
        ariaLabel:
          "Bilingual lyrics: English plus Chinese on every row, but Chinese is sharp only on the currently playing line. Click to cycle display mode",
        shortLabel: "Spotlight",
        icon: <Globe className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-primary",
      };
    case "hide":
      return {
        title:
          "English-first: all Chinese soft until you hover (next: full-line blur)",
        ariaLabel:
          "Bilingual lyrics: English stays sharp; Chinese is blurred until hover. Click to cycle display mode",
        shortLabel: "English",
        icon: <GlobeOff className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-muted-foreground hover:text-foreground",
      };
    case "blur":
      return {
        title:
          "Full blur: both English and Chinese soft until hover (next: full readability)",
        ariaLabel:
          "Both languages blurred until hover. Click to cycle display mode",
        shortLabel: "Blur",
        icon: <EyeClosed className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-muted-foreground hover:text-foreground",
      };
    case "clear":
      return {
        title:
          "Full: sharp English and Chinese on every line—no softening (next: Spotlight)",
        ariaLabel:
          "Bilingual lyrics with both languages fully sharp on all rows, not only the current line. Click to cycle display mode",
        shortLabel: "Full",
        icon: <Eye className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-primary",
      };
  }
}

function trackPlayModeButtonUi(mode: TrackPlayMode): {
  title: string;
  ariaLabel: string;
  shortLabel: string;
  icon: ReactNode;
  accent: boolean;
} {
  switch (mode) {
    case "sequential":
      return {
        title: "Sequential: play lessons in book order (next: reverse order)",
        ariaLabel: "Sequential play, click to change mode",
        shortLabel: "Sequential",
        icon: <ListOrdered className="size-3.5 shrink-0" aria-hidden />,
        accent: false,
      };
    case "reverse":
      return {
        title:
          "Reverse order: after each lesson, play the previous lesson in the book (next: repeat one)",
        ariaLabel: "Reverse course order, click to change mode",
        shortLabel: "Reverse",
        icon: <SortDesc className="size-3.5 shrink-0" aria-hidden />,
        accent: false,
      };
    case "repeatOne":
      return {
        title: "Repeat one (next: sequential)",
        ariaLabel: "Repeat one, click to change mode",
        shortLabel: "Repeat",
        icon: <Repeat1 className="size-3.5 shrink-0" aria-hidden />,
        accent: true,
      };
  }
}

export function TransportExtraCluster({
  playbackRate,
  onCyclePlaybackRate,
  trackPlayMode,
  onCycleTrackPlayMode,
  onCycleTranslationMode,
  translationMode,
  className,
}: {
  playbackRate: number;
  onCyclePlaybackRate: () => void;
  trackPlayMode: TrackPlayMode;
  onCycleTrackPlayMode: () => void;
  onCycleTranslationMode: () => void;
  translationMode: TranslationMode;
  className?: string;
}) {
  const tr = translationModeUi(translationMode);
  const tm = trackPlayModeButtonUi(trackPlayMode);
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
        onClick={onCyclePlaybackRate}
        title={`Speed ${playbackRate}x`}
        aria-label={`Playback speed ${playbackRate}x, click to change`}
      >
        <Gauge className="size-3.5 shrink-0" aria-hidden />
        <span className="text-[0.7rem] font-semibold tabular-nums">
          {playbackRate}x
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 gap-1 px-2 text-muted-foreground hover:text-foreground",
          tm.accent && "text-primary border-primary/50",
        )}
        onClick={onCycleTrackPlayMode}
        title={tm.title}
        aria-label={tm.ariaLabel}
      >
        {tm.icon}
        <span className="text-[0.7rem] font-semibold">{tm.shortLabel}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 gap-1 px-2",
          tr.buttonClass,
          (translationMode === "show" || translationMode === "clear") &&
            "border-primary/50",
        )}
        onClick={onCycleTranslationMode}
        title={tr.title}
        aria-label={tr.ariaLabel}
      >
        {tr.icon}
        <span className="text-[0.7rem] font-semibold">{tr.shortLabel}</span>
      </Button>
    </div>
  );
}

export function PlayerTransportControls({
  mediaTime,
  duration,
  onSeek,
  paused,
  onTogglePlay,
  onPrev,
  onNext,
  playbackRate,
  onCyclePlaybackRate,
  trackPlayMode,
  onCycleTrackPlayMode,
  onCycleTranslationMode,
  translationMode,
  nowPlayingTitle,
  bookTitle,
  coverUrl,
  showTrackInfo = true,
  showExtraCluster = true,
  dock = false,
  dockLeadingOverlay,
}: PlayerTransportControlsProps) {
  const dur = duration || 0;
  const t = Math.min(mediaTime, dur || 0);
  const seekPct = dur > 0 ? Math.min(100, Math.max(0, (t / dur) * 100)) : 0;

  return (
    <div className="w-full">
      {/* Progress */}
      <div
        className={cn(
          "flex items-center sm:gap-4",
          dock ? "mb-2 gap-2" : "mb-3 gap-3",
        )}
      >
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-foreground sm:w-11 sm:text-[0.8125rem]">
          {formatMediaTime(t)}
        </span>
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={dur || 0}
          step={0.01}
          value={t}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="player-transport-seek min-w-0 flex-1"
          style={{ "--seek-pct": `${seekPct}%` } as CSSProperties}
        />
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:w-11 sm:text-[0.8125rem]">
          {formatMediaTime(dur)}
        </span>
      </div>

      {showTrackInfo ? (
        dock ? (
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-2">
            <div className="min-w-0" aria-hidden />
            <TransportPlayCluster
              paused={paused}
              onTogglePlay={onTogglePlay}
              onPrev={onPrev}
              onNext={onNext}
              trackPlayMode={trackPlayMode}
              className="justify-self-center"
            />
            {showExtraCluster ? (
              <TransportExtraCluster
                playbackRate={playbackRate}
                onCyclePlaybackRate={onCyclePlaybackRate}
                trackPlayMode={trackPlayMode}
                onCycleTrackPlayMode={onCycleTrackPlayMode}
                onCycleTranslationMode={onCycleTranslationMode}
                translationMode={translationMode}
                className="min-w-0 justify-self-end"
              />
            ) : (
              <div className="min-w-0" aria-hidden />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4">
            <div className="flex min-w-0 w-full max-w-full items-center gap-3 justify-self-start sm:max-w-[min(100%,22rem)]">
              <BookCoverArt src={coverUrl} variant="transportBar" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {nowPlayingTitle}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {bookTitle?.trim() ? bookTitle : "—"}
                </p>
              </div>
            </div>

            <TransportPlayCluster
              paused={paused}
              onTogglePlay={onTogglePlay}
              onPrev={onPrev}
              onNext={onNext}
              trackPlayMode={trackPlayMode}
              className="sm:justify-self-center"
            />

            {showExtraCluster ? (
              <TransportExtraCluster
                playbackRate={playbackRate}
                onCyclePlaybackRate={onCyclePlaybackRate}
                trackPlayMode={trackPlayMode}
                onCycleTrackPlayMode={onCycleTrackPlayMode}
                onCycleTranslationMode={onCycleTranslationMode}
                translationMode={translationMode}
                className="justify-center sm:justify-self-end"
              />
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {dock && dockLeadingOverlay ? (
            <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
              {/* Match LyricsColumn scroll area: nce-page-wrap px-3 + inner px-3 on mobile */}
              <div className="flex min-w-0 justify-start pl-3">
                {dockLeadingOverlay}
              </div>
              <TransportPlayCluster
                paused={paused}
                onTogglePlay={onTogglePlay}
                onPrev={onPrev}
                onNext={onNext}
                trackPlayMode={trackPlayMode}
                className="justify-center"
              />
              <span className="min-w-0 shrink-0 pr-3" aria-hidden />
            </div>
          ) : (
            <div className="w-full">
              <TransportPlayCluster
                paused={paused}
                onTogglePlay={onTogglePlay}
                onPrev={onPrev}
                onNext={onNext}
                trackPlayMode={trackPlayMode}
                className="justify-center"
              />
            </div>
          )}
          {showExtraCluster ? (
            <TransportExtraCluster
              playbackRate={playbackRate}
              onCyclePlaybackRate={onCyclePlaybackRate}
              trackPlayMode={trackPlayMode}
              onCycleTrackPlayMode={onCycleTrackPlayMode}
              onCycleTranslationMode={onCycleTranslationMode}
              translationMode={translationMode}
              className="justify-center"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

import type { TrackPlayMode, TranslationMode } from "@nce/player";
import {
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
};

function TransportPlayCluster({
  paused,
  onTogglePlay,
  onPrev,
  onNext,
  className,
}: {
  paused: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}) {
  /** Apple Music–style: circular skips with light typography-like strokes; large filled play circle. */
  const skipIconCls = "size-[1.0625rem] sm:size-[1.1875rem]";
  const skipStroke = 1.35;

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
        aria-label="Previous lesson"
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
        aria-label="Next lesson"
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
        title: "Bilingual focus: clear Chinese on current line only (next: English focus)",
        ariaLabel:
          "Lyrics show English plus Chinese on all lines; only the current line has sharp Chinese. Click to cycle display mode",
        shortLabel: "Bilingual",
        icon: <Globe className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-primary",
      };
    case "hide":
      return {
        title: "English focus: all Chinese blurred until hover (next: full blur)",
        ariaLabel:
          "Lyrics show English and Chinese; Chinese is blurred until hover. Click to cycle display mode",
        shortLabel: "English",
        icon: <GlobeOff className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-muted-foreground hover:text-foreground",
      };
    case "blur":
      return {
        title: "Full blur: English and Chinese until hover (next: bilingual focus)",
        ariaLabel:
          "English and Chinese lyrics blurred until hover; click to cycle display mode",
        shortLabel: "Blur",
        icon: <EyeClosed className="size-3.5 shrink-0" aria-hidden />,
        buttonClass: "text-muted-foreground hover:text-foreground",
      };
  }
}

export function TransportExtraCluster({
  playbackRate,
  onCyclePlaybackRate,
  isRepeatOne,
  onCycleTrackPlayMode,
  onCycleTranslationMode,
  translationMode,
  className,
}: {
  playbackRate: number;
  onCyclePlaybackRate: () => void;
  isRepeatOne: boolean;
  onCycleTrackPlayMode: () => void;
  onCycleTranslationMode: () => void;
  translationMode: TranslationMode;
  className?: string;
}) {
  const tr = translationModeUi(translationMode);
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
          isRepeatOne && "text-primary border-primary/50",
        )}
        onClick={onCycleTrackPlayMode}
        title={isRepeatOne ? "Repeat one" : "Sequential"}
        aria-label={
          isRepeatOne
            ? "Repeat one, click to change mode"
            : "Sequential play, click to change mode"
        }
      >
        {isRepeatOne ? (
          <Repeat1 className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <ListOrdered className="size-3.5 shrink-0" aria-hidden />
        )}
        <span className="text-[0.7rem] font-semibold">
          {isRepeatOne ? "Repeat" : "Sequential"}
        </span>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-8 gap-1 px-2",
          tr.buttonClass,
          translationMode === "show" && "border-primary/50",
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
}: PlayerTransportControlsProps) {
  const isRepeatOne = trackPlayMode === "repeatOne";
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
              className="justify-self-center"
            />
            {showExtraCluster ? (
              <TransportExtraCluster
                playbackRate={playbackRate}
                onCyclePlaybackRate={onCyclePlaybackRate}
                isRepeatOne={isRepeatOne}
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
              className="sm:justify-self-center"
            />

            {showExtraCluster ? (
              <TransportExtraCluster
                playbackRate={playbackRate}
                onCyclePlaybackRate={onCyclePlaybackRate}
                isRepeatOne={isRepeatOne}
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
          <TransportPlayCluster
            paused={paused}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
            className="justify-center"
          />
          {showExtraCluster ? (
            <TransportExtraCluster
              playbackRate={playbackRate}
              onCyclePlaybackRate={onCyclePlaybackRate}
              isRepeatOne={isRepeatOne}
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

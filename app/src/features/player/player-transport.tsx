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
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center gap-1 sm:gap-2",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
        onClick={onPrev}
        aria-label="Previous lesson"
      >
        <SkipBack className="size-5" aria-hidden />
      </Button>
      <Button
        type="button"
        variant="default"
        className="size-11 shrink-0 rounded-full shadow-md sm:size-12"
        onClick={onTogglePlay}
        aria-label={paused ? "Play" : "Pause"}
      >
        {paused ? (
          <Play
            className="size-5 translate-x-0.5 sm:size-[1.35rem]"
            fill="currentColor"
            aria-hidden
          />
        ) : (
          <Pause className="size-5 sm:size-[1.35rem]" aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
        onClick={onNext}
        aria-label="Next lesson"
      >
        <SkipForward className="size-5" aria-hidden />
      </Button>
    </div>
  );
}

function translationModeUi(mode: TranslationMode): {
  title: string;
  ariaLabel: string;
  icon: ReactNode;
  buttonClass: string;
} {
  switch (mode) {
    case "show":
      return {
        title: "Chinese subtitles: visible (next: hidden)",
        ariaLabel:
          "Chinese subtitles visible; click to hide Chinese or cycle display mode",
        icon: <Globe className="size-4" aria-hidden />,
        buttonClass: "text-[var(--lagoon-deep)]",
      };
    case "hide":
      return {
        title: "Chinese subtitles: hidden (next: blurred)",
        ariaLabel:
          "Chinese subtitles hidden; click to blur Chinese or cycle display mode",
        icon: <GlobeOff className="size-4" aria-hidden />,
        buttonClass: "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]",
      };
    case "blur":
      return {
        title: "Lyrics blurred until hover (next: visible)",
        ariaLabel:
          "English and Chinese lyrics blurred until hover; click to show clearly or cycle display mode",
        icon: <EyeClosed className="size-4" aria-hidden />,
        buttonClass: "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]",
      };
  }
}

function TransportExtraCluster({
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
    <div className={cn("flex items-center gap-0.5 sm:gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1 px-2 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
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
        variant="ghost"
        size="icon-sm"
        className={cn(
          "text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]",
          isRepeatOne && "text-[var(--lagoon-deep)]",
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
          <Repeat1 className="size-4" aria-hidden />
        ) : (
          <ListOrdered className="size-4" aria-hidden />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={tr.buttonClass}
        onClick={onCycleTranslationMode}
        title={tr.title}
        aria-label={tr.ariaLabel}
      >
        {tr.icon}
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
}: PlayerTransportControlsProps) {
  const isRepeatOne = trackPlayMode === "repeatOne";
  const dur = duration || 0;
  const t = Math.min(mediaTime, dur || 0);
  const seekPct = dur > 0 ? Math.min(100, Math.max(0, (t / dur) * 100)) : 0;

  return (
    <div className="w-full">
      {/* Progress */}
      <div className="mb-3 flex items-center gap-3 sm:gap-4">
        <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-[var(--sea-ink)] sm:w-11 sm:text-[0.8125rem]">
          {formatTime(t)}
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
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--sea-ink-soft)] sm:w-11 sm:text-[0.8125rem]">
          {formatTime(dur)}
        </span>
      </div>

      {showTrackInfo ? (
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-x-4">
          <div className="flex min-w-0 w-full max-w-full items-center gap-3 justify-self-start sm:max-w-[min(100%,22rem)]">
            <BookCoverArt src={coverUrl} variant="transportBar" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-[var(--sea-ink)]">
                {nowPlayingTitle}
              </p>
              <p className="truncate text-xs text-[var(--sea-ink-soft)]">
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

          <TransportExtraCluster
            playbackRate={playbackRate}
            onCyclePlaybackRate={onCyclePlaybackRate}
            isRepeatOne={isRepeatOne}
            onCycleTrackPlayMode={onCycleTrackPlayMode}
            onCycleTranslationMode={onCycleTranslationMode}
            translationMode={translationMode}
            className="justify-center sm:justify-self-end"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <TransportPlayCluster
            paused={paused}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
            className="justify-center"
          />
          <TransportExtraCluster
            playbackRate={playbackRate}
            onCyclePlaybackRate={onCyclePlaybackRate}
            isRepeatOne={isRepeatOne}
            onCycleTrackPlayMode={onCycleTrackPlayMode}
            onCycleTranslationMode={onCycleTranslationMode}
            translationMode={translationMode}
            className="justify-center"
          />
        </div>
      )}
    </div>
  );
}

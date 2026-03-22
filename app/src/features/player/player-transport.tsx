import type { TrackPlayMode } from "@nce/player";
import {
  Gauge,
  Languages,
  ListOrdered,
  Pause,
  Play,
  Repeat1,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "#/components/ui/button.tsx";

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
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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
}: PlayerTransportControlsProps) {
  const isRepeatOne = trackPlayMode === "repeatOne";

  return (
    <div className="w-full">
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={duration || 0}
        step={0.01}
        value={Math.min(mediaTime, duration || 0)}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="mb-1 w-full accent-[var(--lagoon-deep)]"
      />
      <div className="mb-3 flex justify-between text-xs tabular-nums opacity-70">
        <span>{formatTime(mediaTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onPrev}
            aria-label="Previous lesson"
          >
            <SkipBack className="size-3.5" aria-hidden />
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={onTogglePlay}
            aria-label={paused ? "Play" : "Pause"}
          >
            {paused ? (
              <Play className="size-3.5" aria-hidden fill="currentColor" />
            ) : (
              <Pause className="size-3.5" aria-hidden />
            )}
            {paused ? "Play" : "Pause"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onNext}
            aria-label="Next lesson"
          >
            Next
            <SkipForward className="size-3.5" aria-hidden />
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCyclePlaybackRate}
            aria-label={`Playback speed ${playbackRate}x, click to change`}
          >
            <Gauge className="size-3.5" aria-hidden />
            {playbackRate}x
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCycleTrackPlayMode}
            aria-label={
              isRepeatOne ? "Repeat one, click to change mode" : "Sequential play, click to change mode"
            }
          >
            {isRepeatOne ? (
              <Repeat1 className="size-3.5" aria-hidden />
            ) : (
              <ListOrdered className="size-3.5" aria-hidden />
            )}
            {isRepeatOne ? "Repeat one" : "Sequential"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCycleTranslationMode}
            aria-label="Chinese or English subtitles, click to cycle"
          >
            <Languages className="size-3.5" aria-hidden />
            中/英
          </Button>
        </div>
      </div>
    </div>
  );
}

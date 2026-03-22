import { Button } from "@heroui/react";
import type { TrackPlayMode } from "@nce/player";

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
  const modeLabel =
    trackPlayMode === "repeatOne" ? "Repeat one" : "Sequential";

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
          <Button size="sm" variant="outline" onPress={onPrev}>
            Previous
          </Button>
          <Button size="sm" variant="primary" onPress={onTogglePlay}>
            {paused ? "Play" : "Pause"}
          </Button>
          <Button size="sm" variant="outline" onPress={onNext}>
            Next
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="outline" onPress={onCyclePlaybackRate}>
            {playbackRate}x
          </Button>
          <Button size="sm" variant="outline" onPress={onCycleTrackPlayMode}>
            {modeLabel}
          </Button>
          <Button size="sm" variant="outline" onPress={onCycleTranslationMode}>
            中/英
          </Button>
        </div>
      </div>
    </div>
  );
}

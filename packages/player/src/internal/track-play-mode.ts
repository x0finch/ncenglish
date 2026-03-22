export type TrackPlayMode = "sequential" | "repeatOne";

export type TrackEndedAction = "next" | "replay" | "stop";

export type TrackEndedResolution = { action: TrackEndedAction };

export function resolveAfterTrackEnded(input: {
  mode: TrackPlayMode;
  unitIndex: number;
  unitCount: number;
}): TrackEndedResolution {
  const { mode, unitIndex, unitCount } = input;
  if (unitCount <= 0 || unitIndex < 0 || unitIndex >= unitCount) {
    return { action: "stop" };
  }
  if (mode === "repeatOne") {
    return { action: "replay" };
  }
  if (unitIndex < unitCount - 1) {
    return { action: "next" };
  }
  return { action: "stop" };
}

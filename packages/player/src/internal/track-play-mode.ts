export type TrackPlayMode = "sequential" | "reverse" | "repeatOne";

export type TrackEndedAction = "next" | "prev" | "replay" | "stop";

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
  if (mode === "reverse") {
    if (unitIndex > 0) {
      return { action: "prev" };
    }
    return { action: "stop" };
  }
  if (unitIndex < unitCount - 1) {
    return { action: "next" };
  }
  return { action: "stop" };
}

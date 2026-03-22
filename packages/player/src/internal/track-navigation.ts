/**
 * Next unit index after "next track"; stays on the last unit when already at the end.
 */
export function nextUnitIndex(unitIndex: number, unitCount: number): number {
  if (unitCount <= 0) {
    return 0;
  }
  const last = unitCount - 1;
  const clamped = Math.min(Math.max(unitIndex, 0), last);
  if (clamped >= last) {
    return last;
  }
  return clamped + 1;
}

/**
 * Previous unit index; stays on 0 when already at the start.
 */
export function prevUnitIndex(unitIndex: number): number {
  const clamped = Math.max(unitIndex, 0);
  if (clamped <= 0) {
    return 0;
  }
  return clamped - 1;
}

export function canNext(unitIndex: number, unitCount: number): boolean {
  if (unitCount <= 0) {
    return false;
  }
  return unitIndex < unitCount - 1;
}

export function canPrev(unitIndex: number): boolean {
  return unitIndex > 0;
}

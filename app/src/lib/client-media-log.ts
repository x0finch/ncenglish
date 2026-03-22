/** Browser-side media / catalog diagnostics (prefix: [nce:media]). */

function enabledVerbose(): boolean {
  return (
    import.meta.env.DEV === true ||
    import.meta.env.VITE_NCE_LOG_MEDIA === "1"
  );
}

/** Always log (errors, missing resources). */
export function logMediaWarn(message: string, data?: Record<string, unknown>): void {
  if (data) {
    console.warn("[nce:media]", message, data);
  } else {
    console.warn("[nce:media]", message);
  }
}

/** Success path / init: only in dev or when VITE_NCE_LOG_MEDIA=1. */
export function logMediaInfo(message: string, data?: Record<string, unknown>): void {
  if (!enabledVerbose()) return;
  if (data) {
    console.info("[nce:media]", message, data);
  } else {
    console.info("[nce:media]", message);
  }
}

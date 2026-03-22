/**
 * TanStack Devtools merges localStorage after `config`, so saved `position` wins over
 * `<TanStackDevtools config={{ position: 'top-right' }} />`. Sync storage so the trigger stays top-right.
 * Key matches @tanstack/devtools `TANSTACK_DEVTOOLS_SETTINGS`.
 */
const TANSTACK_DEVTOOLS_SETTINGS = "tanstack_devtools_settings";

export function syncTanstackDevtoolsTriggerToTopRight(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(TANSTACK_DEVTOOLS_SETTINGS);
    let parsed: Record<string, unknown> = {};
    if (raw) {
      const v = JSON.parse(raw) as unknown;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        parsed = v as Record<string, unknown>;
      }
    }
    if (parsed.position === "top-right") return;
    localStorage.setItem(
      TANSTACK_DEVTOOLS_SETTINGS,
      JSON.stringify({ ...parsed, position: "top-right" }),
    );
  } catch {
    // Private mode or corrupt JSON — ignore
  }
}

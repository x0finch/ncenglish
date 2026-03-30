import type { TranslationMode } from "./preferences.ts";

const ORDER: readonly TranslationMode[] = ["show", "hide", "blur", "clear"];

export function cycleTranslationMode(current: TranslationMode): TranslationMode {
  const i = ORDER.indexOf(current);
  const idx = i >= 0 ? i : 0;
  const next = ORDER[(idx + 1) % ORDER.length];
  return next ?? "show";
}

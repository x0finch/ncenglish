import { describe, expect, it } from "vitest";
import { cycleTranslationMode } from "../../internal/translation-mode.ts";

describe("translation-mode", () => {
  it("cycles show -> hide -> blur -> clear -> show", () => {
    expect(cycleTranslationMode("show")).toBe("hide");
    expect(cycleTranslationMode("hide")).toBe("blur");
    expect(cycleTranslationMode("blur")).toBe("clear");
    expect(cycleTranslationMode("clear")).toBe("show");
  });
});

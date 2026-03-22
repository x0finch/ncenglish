import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseNceIndex } from "../../internal/parse.ts";
import { getBookByKey, isLegacy85Edition } from "../../internal/queries.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoIndexPath = join(__dirname, "../../../nce-r2-index.json");

describe("getBookByKey", () => {
  it("returns the matching book", () => {
    const index = parseNceIndex(
      JSON.parse(readFileSync(repoIndexPath, "utf8")) as unknown,
    );
    expect(getBookByKey(index, "NCE3")?.key).toBe("NCE3");
    expect(getBookByKey(index, "missing")).toBeUndefined();
  });
});

describe("isLegacy85Edition", () => {
  it("detects (85) series keys", () => {
    expect(isLegacy85Edition("NCE1(85)")).toBe(true);
    expect(isLegacy85Edition("NCE1")).toBe(false);
  });
});

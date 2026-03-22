import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseNceIndex } from "../../internal/parse.ts";
import { nceIndexSchema } from "../../internal/schema.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoIndexPath = join(__dirname, "../../../nce-r2-index.json");

describe("parseNceIndex", () => {
  it("parses the real nce-r2-index.json", () => {
    const raw = JSON.parse(readFileSync(repoIndexPath, "utf8")) as unknown;
    const index = parseNceIndex(raw);
    expect(index.version).toBe(2);
    expect(index.books.length).toBe(8);
    const nce1 = index.books.find((b) => b.key === "NCE1");
    expect(nce1?.units[0]).toBe("001&002.Excuse Me");
  });

  it("throws on invalid payload", () => {
    expect(() => parseNceIndex({})).toThrow();
    expect(() => parseNceIndex(null)).toThrow();
  });
});

describe("nceIndexSchema", () => {
  it("safeParse fails on bad shape", () => {
    const r = nceIndexSchema.safeParse({ version: 1, books: [] });
    expect(r.success).toBe(false);
  });
});

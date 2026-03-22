import { describe, expect, it } from "vitest";
import { normalizePublicMediaBase } from "./catalog-client.ts";

describe("normalizePublicMediaBase", () => {
  it("strips trailing slashes when set", () => {
    expect(normalizePublicMediaBase("https://cdn.example/r2/")).toBe("https://cdn.example/r2");
  });
  it("returns empty when unset", () => {
    expect(normalizePublicMediaBase(undefined)).toBe("");
  });
});

import type { NceIndex } from "./schema.ts";
import { nceIndexSchema } from "./schema.ts";

export function parseNceIndex(input: unknown): NceIndex {
  return nceIndexSchema.parse(input);
}

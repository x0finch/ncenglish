import type { NceBook, NceIndex } from "./schema.ts";

export function getBookByKey(
  index: NceIndex,
  key: string,
): NceBook | undefined {
  return index.books.find((b) => b.key === key);
}

export function isLegacy85Edition(bookKey: string): boolean {
  return bookKey.includes("(85)");
}

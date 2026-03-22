import { catalog } from "./catalog.ts";

/**
 * Textbook catalog facade (bundled index + typed API).
 *
 * - Runtime: `import catalog from "@nce/catalog"` then `catalog.listBooks()`, etc.
 * - Types: `import type { BookDetail, UnitMedia, … } from "@nce/catalog"`.
 */
export default catalog;

export type {
  BookDetail,
  BookSummary,
  Catalog,
  CatalogIndex,
  CatalogInitOptions,
  LyricLine,
  ParseLyricsOptions,
  Unit,
  UnitMedia,
} from "./catalog.ts";

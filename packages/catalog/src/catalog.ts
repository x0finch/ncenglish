import { parseNceIndex } from "./internal/parse.ts";
import {
  NCE_LEGACY_SYNC_OFFSET,
  findActiveLineIndex,
  parseLrc,
  type LrcLine,
} from "./internal/parse-lrc.ts";
import { getBookByKey } from "./internal/queries.ts";
import {
  normalizeBaseUrl,
  resolveBookUrls,
  resolveUnitUrls,
} from "./internal/resolve.ts";
import type { NceBook, NceIndex } from "./internal/schema.ts";

import bundledIndexJson from "../nce-r2-index.json";

// --- Public types (catalog API shapes) ---

/** Full textbook index (same shape as bundled `nce-r2-index.json` v2). */
export type CatalogIndex = NceIndex;

export type CatalogInitOptions = {
  /** Public base URL for R2/CDN (no trailing slash required). Required before media URL methods. */
  baseUrl: string;
};

export type BookSummary = {
  key: string;
  title: string;
  bookName: string;
  bookLevel: string;
  /** Derived from `key` (e.g. contains `(85)`). */
  edition: "classic" | "85";
  unitCount: number;
};

export type BookDetail = BookSummary & {
  coverFile: string;
  mirrorRoot: string;
  /** Unit basenames aligned with `.mp3` / `.lrc` on R2. */
  units: string[];
};

/** One lesson row in a book playlist (`listUnits`). */
export type Unit = {
  /** Same string as in `BookDetail.units`. */
  entry: string;
  /** Zero-based order in the book playlist. */
  index: number;
};

/** Resolved HTTPS URLs for playback and metadata. */
export type UnitMedia = {
  audioUrl: string;
  lrcUrl: string;
  coverUrl: string;
  bookJsonUrl: string;
};

export type LyricLine = {
  timeSec: number;
  english: string;
  chinese: string;
};

export type ParseLyricsOptions = {
  /** When true, applies the same -0.5s offset as legacy `NCE/js/main.js` LRCParser. */
  useLegacySyncOffset?: boolean;
};

// --- Implementation ---

function editionOf(key: string): "classic" | "85" {
  return key.includes("(85)") ? "85" : "classic";
}

function toBookSummary(b: NceBook): BookSummary {
  return {
    key: b.key,
    title: b.title,
    bookName: b.bookName,
    bookLevel: b.bookLevel,
    edition: editionOf(b.key),
    unitCount: b.units.length,
  };
}

function toBookDetail(b: NceBook): BookDetail {
  return {
    ...toBookSummary(b),
    coverFile: b.coverFile,
    mirrorRoot: b.mirrorRoot,
    units: [...b.units],
  };
}

function toLyricLine(line: LrcLine): LyricLine {
  return {
    timeSec: line.time,
    english: line.english,
    chinese: line.chinese,
  };
}

function toInternalLyricLines(lines: readonly LyricLine[]): LrcLine[] {
  return lines.map((d) => ({
    time: d.timeSec,
    english: d.english,
    chinese: d.chinese,
  }));
}

let cachedIndex: CatalogIndex | null = null;
let mediaBaseUrl: string | null = null;

/** Clears init cache; for tests only. */
export function __resetCatalogStateForTesting() {
  cachedIndex = null;
  mediaBaseUrl = null;
}

function getIndexCached(): CatalogIndex {
  if (!cachedIndex) {
    cachedIndex = parseNceIndex(bundledIndexJson as unknown);
  }
  return cachedIndex;
}

function requireMediaBase(): string {
  if (!mediaBaseUrl) {
    throw new Error(
      'catalog.init({ baseUrl }) must be called before resolving media URLs (e.g. getUnitMedia).',
    );
  }
  return mediaBaseUrl;
}

export type Catalog = {
  init(options: CatalogInitOptions): void;
  getIndex(): CatalogIndex;
  listBooks(): BookSummary[];
  getBook(bookKey: string): BookDetail | undefined;
  /** Cover image URL for the book (same for all units). Requires `init`. */
  getBookCoverUrl(bookKey: string): string;
  listUnits(bookKey: string): Unit[];
  getUnitMedia(bookKey: string, unitEntry: string): UnitMedia;
  parseLyrics(lrcText: string, options?: ParseLyricsOptions): LyricLine[];
  activeLyricIndex(lines: readonly LyricLine[], timeSec: number): number;
};

export const catalog: Catalog = {
  init(options: CatalogInitOptions) {
    mediaBaseUrl = normalizeBaseUrl(options.baseUrl);
  },

  getIndex() {
    return getIndexCached();
  },

  listBooks() {
    return getIndexCached().books.map(toBookSummary);
  },

  getBook(bookKey: string) {
    const b = getBookByKey(getIndexCached(), bookKey);
    return b ? toBookDetail(b) : undefined;
  },

  getBookCoverUrl(bookKey: string) {
    const baseUrl = requireMediaBase();
    const b = getBookByKey(getIndexCached(), bookKey);
    if (!b) {
      throw new Error(`Unknown book key: ${bookKey}`);
    }
    return resolveBookUrls(b, baseUrl).cover;
  },

  listUnits(bookKey: string) {
    const b = getBookByKey(getIndexCached(), bookKey);
    if (!b) return [];
    return b.units.map((entry, index) => ({ entry, index }));
  },

  getUnitMedia(bookKey: string, unitEntry: string) {
    const baseUrl = requireMediaBase();
    const b = getBookByKey(getIndexCached(), bookKey);
    if (!b) {
      throw new Error(`Unknown book key: ${bookKey}`);
    }
    if (!b.units.includes(unitEntry)) {
      throw new Error(
        `Unknown unit for book ${bookKey}: ${unitEntry}`,
      );
    }
    const bookUrls = resolveBookUrls(b, baseUrl);
    const unitUrls = resolveUnitUrls(b, baseUrl, unitEntry);
    return {
      audioUrl: unitUrls.audio,
      lrcUrl: unitUrls.lrc,
      coverUrl: bookUrls.cover,
      bookJsonUrl: bookUrls.bookJson,
    };
  },

  parseLyrics(lrcText: string, options?: ParseLyricsOptions) {
    const lines = parseLrc(lrcText, {
      syncOffsetSec: options?.useLegacySyncOffset
        ? NCE_LEGACY_SYNC_OFFSET
        : 0,
    });
    return lines.map(toLyricLine);
  },

  activeLyricIndex(lines: readonly LyricLine[], timeSec: number) {
    return findActiveLineIndex(toInternalLyricLines(lines), timeSec);
  },
};

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import catalog from "@nce/catalog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#/components/ui/tabs.tsx";
import { BookCoverArt } from "../components/book-cover-art.tsx";
import { useNceStore } from "../features/player/nce-store.ts";

export const Route = createFileRoute("/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const [q, setQ] = useState("");
  const setBook = useNceStore((s) => s.setBook);
  const books = useMemo(() => catalog.listBooks(), []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return books;
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(needle) ||
        b.key.toLowerCase().includes(needle),
    );
  }, [books, q]);

  const coverByKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of books) {
      try {
        m.set(b.key, catalog.getBookCoverUrl(b.key));
      } catch {
        /* catalog.init missing or unknown key */
      }
    }
    return m;
  }, [books]);

  return (
    <main className="nce-page-wrap min-w-0 px-2 pb-28 pt-4 md:px-4 md:pb-10 md:pt-6">
      <Tabs defaultValue="all" className="w-full">
        <div className="mb-8 flex max-w-6xl flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <TabsList
            variant="line"
            aria-label="Book edition"
            className="h-auto w-full flex-wrap justify-start gap-x-1 gap-y-0 rounded-none border-0 border-b border-border bg-transparent p-0 sm:w-auto"
          >
            <TabsTrigger
              value="all"
              className="rounded-none border-b-2 border-transparent px-0 pb-2.5 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none sm:px-1 sm:pb-3"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="classic"
              className="rounded-none border-b-2 border-transparent px-0 pb-2.5 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none sm:px-1 sm:pb-3"
            >
              Classic
            </TabsTrigger>
            <TabsTrigger
              value="ed85"
              className="rounded-none border-b-2 border-transparent px-0 pb-2.5 text-sm data-active:border-primary data-active:bg-transparent data-active:shadow-none sm:px-1 sm:pb-3"
            >
              85 ed.
            </TabsTrigger>
          </TabsList>

          <div className="flex w-full flex-col gap-1 sm:w-auto sm:min-w-[14rem] sm:max-w-xs">
            <label htmlFor="library-search" className="sr-only">
              Search books
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-60"
                aria-hidden
              />
              <input
                id="library-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/55 focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {q.trim() ? (
              <p className="text-xs text-muted-foreground">
                {filtered.length} match{filtered.length === 1 ? "" : "es"}
              </p>
            ) : null}
          </div>
        </div>

        <TabsContent value="all" className="mt-0 outline-none">
          <BookGrid
            books={filtered}
            coverByKey={coverByKey}
            setBook={setBook}
            emptyMessage="No books match your search."
          />
        </TabsContent>
        <TabsContent value="classic" className="mt-0 outline-none">
          <BookGrid
            books={filtered.filter((b) => b.edition === "classic")}
            coverByKey={coverByKey}
            setBook={setBook}
            emptyMessage="No Classic books match your search."
          />
        </TabsContent>
        <TabsContent value="ed85" className="mt-0 outline-none">
          <BookGrid
            books={filtered.filter((b) => b.edition === "85")}
            coverByKey={coverByKey}
            setBook={setBook}
            emptyMessage="No 85 edition books match your search."
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function BookGrid({
  books,
  coverByKey,
  setBook,
  emptyMessage,
}: {
  books: ReturnType<typeof catalog.listBooks>;
  coverByKey: Map<string, string>;
  setBook: (key: string) => void;
  emptyMessage: string;
}) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-20 text-center">
        <Sparkles
          className="mb-3 size-8 text-muted-foreground opacity-50"
          aria-hidden
        />
        <p className="max-w-sm text-sm text-foreground">{emptyMessage}</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Try another tab or clear search.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-2 items-start justify-items-stretch gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-10 md:grid-cols-4">
        {books.map((b) => (
          <div
            key={b.key}
            className="flex min-w-0 justify-center"
          >
            <BookCard
              book={b}
              coverUrl={coverByKey.get(b.key)}
              onOpen={() => setBook(b.key)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function BookCard({
  book,
  coverUrl,
  onOpen,
}: {
  book: ReturnType<typeof catalog.listBooks>[number];
  coverUrl?: string;
  onOpen: () => void;
}) {
  const navigate = useNavigate();
  const is85 = book.edition === "85";

  const open = () => {
    onOpen();
    void navigate({
      to: "/play/$bookKey",
      params: { bookKey: book.key },
      search: { unit: undefined },
    });
  };

  return (
    <button
      type="button"
      onClick={open}
      className="group mx-auto flex min-w-0 w-full max-w-[10rem] flex-col items-center overflow-visible text-left outline-none transition duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:max-w-[11rem]"
    >
      <BookCoverArt src={coverUrl} variant="grid" />

      <div className="w-full pt-2.5 sm:pt-3">
        <h3 className="line-clamp-2 text-pretty text-sm font-semibold leading-snug tracking-tight text-foreground sm:text-[0.9375rem]">
          {book.title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {book.bookLevel}
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          {is85 ? "85 edition" : "Classic"}
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
          {book.unitCount} lessons
        </p>
      </div>
    </button>
  );
}

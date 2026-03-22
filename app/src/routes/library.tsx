import { Button, Card, Chip } from "@heroui/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import catalog from "@nce/catalog";
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

  const classic = filtered.filter((b) => b.edition === "classic");
  const ed85 = filtered.filter((b) => b.edition === "85");

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
    <main className="nce-page-wrap px-4 pb-28 pt-4 md:pb-10">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Library</h1>
      <div className="mb-6 max-w-md">
        <label
          htmlFor="library-search"
          className="mb-1 block text-sm font-medium opacity-80"
        >
          Search
        </label>
        <input
          id="library-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Book title or key"
          className="focus:ring-lagoon-deep/40 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm outline-none focus:ring-2"
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--kicker)]">
          Classic
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {classic.map((b) => (
            <BookCard
              key={b.key}
              book={b}
              coverUrl={coverByKey.get(b.key)}
              onOpen={() => setBook(b.key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--kicker)]">
          85 edition
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {ed85.map((b) => (
            <BookCard
              key={b.key}
              book={b}
              coverUrl={coverByKey.get(b.key)}
              onOpen={() => setBook(b.key)}
            />
          ))}
        </div>
      </section>
    </main>
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
  return (
    <Card className="border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-sm">
      <div className="mb-2 aspect-[3/4] w-full overflow-hidden rounded-lg bg-[var(--chip-bg)]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.remove();
            }}
          />
        ) : null}
      </div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <Chip size="sm">{book.bookLevel}</Chip>
        <span className="text-xs opacity-60">{book.unitCount} units</span>
      </div>
      <p className="mb-3 line-clamp-3 text-sm font-semibold leading-snug">
        {book.title}
      </p>
      <Button
        className="w-full"
        onPress={() => {
          onOpen();
          void navigate({
            to: "/play/$bookKey",
            params: { bookKey: book.key },
            search: { unit: undefined },
          });
        }}
      >
        Open
      </Button>
    </Card>
  );
}

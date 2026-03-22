import { BookOpen, ListMusic } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "#/lib/utils.ts";

export type BookCoverArtVariant =
  | "grid"
  | "sidebar"
  | "transportMini"
  | "transportBar"
  | "dialog";

export type BookCoverArtProps = {
  /** Cover image URL; null/undefined shows no image (grid uses a placeholder). */
  src?: string | null;
  variant: BookCoverArtVariant;
  className?: string;
};

/**
 * Book cover image with object-contain (no cropping). Layout depends on variant.
 */
export function BookCoverArt({ src, variant, className }: BookCoverArtProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const effectiveSrc = broken ? null : src;

  if (variant === "grid") {
    if (!effectiveSrc) {
      return <BookCoverGridPlaceholder className={className} />;
    }
    return (
      <div className={cn("w-full min-w-0 shrink-0", className)}>
        <img
          src={effectiveSrc}
          alt=""
          className="block h-auto w-full max-w-full rounded-lg object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  if (variant === "sidebar") {
    if (!effectiveSrc) return null;
    return (
      <div
        className={cn(
          // self-start: avoid flex row stretch pulling this to full text column height (causes vertical gaps).
          // max-* on img only: hug image aspect — no letterboxing inside a fixed h-20 frame.
          "inline-flex shrink-0 self-start overflow-hidden rounded-lg bg-[var(--chip-bg)]",
          className,
        )}
      >
        <img
          src={effectiveSrc}
          alt=""
          className="block h-auto max-h-20 w-auto max-w-14 object-contain"
          decoding="async"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  if (variant === "transportMini") {
    return (
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--chip-bg)]",
          className,
        )}
      >
        {effectiveSrc ? (
          <img
            src={effectiveSrc}
            alt=""
            className="h-auto max-h-full w-auto max-w-full object-contain"
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : null}
      </div>
    );
  }

  if (variant === "transportBar") {
    return (
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--chip-bg)] shadow-[inset_0_1px_0_var(--inset-glint)] ring-1 ring-[var(--line)]/70",
          className,
        )}
      >
        {effectiveSrc ? (
          <img
            src={effectiveSrc}
            alt=""
            className="h-auto max-h-full w-auto max-w-full object-contain"
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : (
          <ListMusic
            className="size-7 text-[var(--lagoon-deep)]/30"
            aria-hidden
          />
        )}
      </div>
    );
  }

  // dialog
  if (!effectiveSrc) return null;
  return (
    <div className={cn("flex w-full min-w-0 justify-center", className)}>
      <img
        src={effectiveSrc}
        alt=""
        className="block h-auto w-full max-w-[10rem] rounded-lg object-contain sm:max-w-[11rem]"
        decoding="async"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

function BookCoverGridPlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[9rem] w-full max-w-[8.25rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--chip-bg)] to-[color-mix(in_oklab,var(--lagoon)_14%,var(--chip-bg))] sm:min-h-[9.5rem] sm:max-w-[9.25rem]",
        className,
      )}
      aria-hidden
    >
      <BookOpen className="size-10 text-[var(--lagoon-deep)]/30 sm:size-11" />
    </div>
  );
}

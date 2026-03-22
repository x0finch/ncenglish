import { Link, useRouterState } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { cn } from "#/lib/utils.ts";

export default function Header() {
  const isLibraryPage = useRouterState({
    select: (s) =>
      s.location.pathname === "/library" ||
      s.location.pathname.startsWith("/library/"),
  });

  const isPlayPage = useRouterState({
    select: (s) => s.location.pathname.startsWith("/play/"),
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background px-2 pt-[env(safe-area-inset-top)] md:px-4">
      <nav
        className={cn(
          "nce-page-wrap flex items-center py-3 sm:py-4",
          /* Match play page lyrics card inner edge: main px-2 + card p-3 */
          isPlayPage && "max-md:pl-3",
        )}
        aria-label="Primary"
      >
        {isLibraryPage ? (
          <h1 className="m-0 text-sm font-semibold tracking-tight text-foreground md:text-base">
            New Concept English
          </h1>
        ) : (
          <div className="text-sm font-semibold">
            <Link
              to="/library"
              className="nav-link inline-flex items-center gap-1.5"
              activeProps={{
                className: "nav-link is-active inline-flex items-center gap-1.5",
              }}
            >
              <Library className="size-4 opacity-80" aria-hidden />
              Library
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

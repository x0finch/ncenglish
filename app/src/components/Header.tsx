import { Link, useRouterState } from "@tanstack/react-router";
import { Headphones, Library } from "lucide-react";

export default function Header() {
  const isPlayPage = useRouterState({
    select: (s) => s.location.pathname.startsWith("/play/"),
  });

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav
        className={
          isPlayPage
            ? "nce-page-wrap flex items-center py-3 sm:py-4"
            : "nce-page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4"
        }
      >
        {!isPlayPage ? (
          <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
            >
              <Headphones className="size-4 text-[var(--lagoon-deep)]" aria-hidden />
              NCE Player
            </Link>
          </h2>
        ) : null}

        <div
          className={
            isPlayPage
              ? "text-sm font-semibold"
              : "order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:ml-4 sm:w-auto sm:flex-nowrap sm:pb-0"
          }
        >
          <Link
            to="/library"
            className="nav-link inline-flex items-center gap-1.5"
            activeProps={{ className: "nav-link is-active inline-flex items-center gap-1.5" }}
          >
            <Library className="size-4 opacity-80" aria-hidden />
            Library
          </Link>
        </div>
      </nav>
    </header>
  );
}

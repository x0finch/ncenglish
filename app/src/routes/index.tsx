import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNceStore } from "../features/player/nce-store.ts";

export const Route = createFileRoute("/")({
  component: HomeRedirect,
});

function HomeRedirect() {
  const navigate = useNavigate();
  const bookKey = useNceStore((s) => s.bookKey);

  useEffect(() => {
    if (bookKey) {
      void navigate({
        to: "/play/$bookKey",
        params: { bookKey },
        search: { unit: undefined },
        replace: true,
      });
    } else {
      void navigate({ to: "/library", replace: true });
    }
  }, [bookKey, navigate]);

  return (
    <div className="nce-page-wrap flex min-h-0 flex-1 items-center justify-center px-2 text-sm text-muted-foreground md:px-4">
      Redirecting…
    </div>
  );
}

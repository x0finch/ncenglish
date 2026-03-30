import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Header from "../components/Header.tsx";
import { TooltipProvider } from "../components/ui/tooltip.tsx";
import { initClientCatalog } from "../lib/catalog-client.ts";
import { syncTanstackDevtoolsTriggerToTopRight } from "../lib/tanstack-devtools-layout.ts";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  initClientCatalog();
  syncTanstackDevtoolsTriggerToTopRight();
  const isPlayRoute = useRouterState({
    select: (s) => s.location.pathname.startsWith("/play/"),
  });
  return (
    <TooltipProvider delay={0}>
      <div className="flex h-dvh min-h-0 flex-col bg-background">
        {!isPlayRoute ? <Header /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <Outlet />
        </div>
        <TanStackDevtools
          config={{ position: "top-right" }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </div>
    </TooltipProvider>
  );
}

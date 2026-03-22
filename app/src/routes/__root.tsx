import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import Header from "../components/Header.tsx";
import { initClientCatalog } from "../lib/catalog-client.ts";
import { syncTanstackDevtoolsTriggerToTopRight } from "../lib/tanstack-devtools-layout.ts";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  initClientCatalog();
  syncTanstackDevtoolsTriggerToTopRight();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
  );
}

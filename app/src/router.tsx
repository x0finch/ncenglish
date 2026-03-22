import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";

function routerBasepath(): string | undefined {
  const raw = import.meta.env.BASE_URL;
  if (!raw || raw === "/") return undefined;
  return raw.replace(/\/+$/, "") || undefined;
}

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: routerBasepath(),
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

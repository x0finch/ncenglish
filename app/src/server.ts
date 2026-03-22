/// <reference types="@cloudflare/workers-types" />

import handler from "@tanstack/react-start/server-entry";
import type { Env } from "./worker/env.ts";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return handler.fetch(request, { context: { env, ctx } } as never);
  },
} satisfies ExportedHandler<Env>;

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";

/**
 * Amizone is slow and a cold go-amizone session adds a CapSolver Turnstile
 * solve on top, so this needs far more than the default budget. 60s is the
 * ceiling that is safe on every Vercel plan; with Fluid Compute on Pro you can
 * raise it (and the timeouts in server/config.ts) if logins are being cut off.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ path, error }) {
      console.error(`[trpc] ${path ?? "<no-path>"}: ${error.message}`);
    },
  });
}

export { handler as GET, handler as POST };

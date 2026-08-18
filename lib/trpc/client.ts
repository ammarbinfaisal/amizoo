import { createTRPCClient, httpLink } from "@trpc/client";

import type { AppRouter } from "@/server/trpc/routers/_app";

/**
 * Deliberately `httpLink` rather than `httpBatchLink`: unbatched queries go out
 * as plain GETs with a stable URL per resource, which is what lets the service
 * worker cache them for offline use. Batching would collapse them into one
 * opaque POST-shaped URL and break the PWA story.
 */
export const trpc = createTRPCClient<AppRouter>({
  links: [httpLink({ url: "/api/trpc" })],
});

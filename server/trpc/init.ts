import { initTRPC, TRPCError } from "@trpc/server";

import { AmizoneApiError } from "../amizone-api";
import { clearSession, readSession } from "../session";

export async function createTRPCContext() {
  return { session: await readSession() };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

/** Requires a decryptable credential cookie. */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    // The cookie may be present but unreadable — expired, tampered with, or
    // sealed under a rotated SESSION_SECRET. Drop it, otherwise middleware
    // keeps seeing a "session" and bounces /login back to /dashboard forever.
    await clearSession();
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

/**
 * Translates upstream failures into tRPC errors.
 *
 * A 401 means the stored credentials no longer work (password changed, or they
 * were wrong all along), so the cookie is dropped here — otherwise the client
 * would bounce between dashboard and login forever.
 */
export async function fromAmizone<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!(error instanceof AmizoneApiError)) throw error;

    if (error.status === 401) {
      await clearSession();
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Your Amizone credentials are no longer valid. Please sign in again.",
      });
    }
    if (error.status === 504) {
      throw new TRPCError({ code: "TIMEOUT", message: error.message });
    }
    throw new TRPCError({ code: "BAD_GATEWAY", message: error.message });
  }
}

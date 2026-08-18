import { TRPCError } from "@trpc/server";
import { type } from "arktype";

import type { Profile } from "@/lib/types";

import { AMIZONE_LOGIN_TIMEOUT_MS } from "../../config";
import { AmizoneApiError, amizoneRequest } from "../../amizone-api";
import { CACHE_TTL, cached } from "../../cache";
import { clearSession, writeSession } from "../../session";
import { publicProcedure, router } from "../init";

const credentialsInput = type({
  username: "string > 0",
  password: "string > 0",
});

export const authRouter = router({
  /** Who, if anyone, is signed in. Never returns the password. */
  me: publicProcedure.query(({ ctx }) =>
    ctx.session ? { username: ctx.session.username } : null
  ),

  login: publicProcedure
    .input(credentialsInput)
    .mutation(async ({ input }) => {
      const session = { username: input.username, password: input.password };

      // Credentials are only trusted once Amizone has accepted them. This is the
      // one call that may trigger a full login + CAPTCHA solve upstream, so it
      // gets the longer timeout.
      let profile: Profile;
      try {
        profile = await amizoneRequest<Profile>("/api/v1/user_profile", session, {
          timeoutMs: AMIZONE_LOGIN_TIMEOUT_MS,
        });
      } catch (error) {
        if (error instanceof AmizoneApiError) {
          if (error.status === 401) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Incorrect username or password",
            });
          }
          if (error.status === 504) {
            throw new TRPCError({ code: "TIMEOUT", message: error.message });
          }
          throw new TRPCError({ code: "BAD_GATEWAY", message: error.message });
        }
        throw error;
      }

      await writeSession(session);

      // The dashboard asks for the profile immediately after redirecting; seed
      // the cache so that first render does not go upstream again.
      await cached<Profile>({
        username: session.username,
        resource: "profile",
        ttlSeconds: CACHE_TTL.profile,
        fresh: true,
        load: async () => profile,
      });

      return { username: session.username, profile };
    }),

  logout: publicProcedure.mutation(async () => {
    await clearSession();
    return { success: true } as const;
  }),
});

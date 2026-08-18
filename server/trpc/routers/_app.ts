import { router } from "../init";
import { amizoneRouter } from "./amizone";
import { authRouter } from "./auth";

export const appRouter = router({
  auth: authRouter,
  amizone: amizoneRouter,
});

export type AppRouter = typeof appRouter;

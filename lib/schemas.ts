import { type } from "arktype";

export const loginSchema = type({
  username: "string > 0",
  password: "string > 0",
});

export type LoginFormValues = typeof loginSchema.infer;

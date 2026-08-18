import { z } from "zod";

const MIN_PASSWORD_LENGTH = 8;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(MIN_PASSWORD_LENGTH, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

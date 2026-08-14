import { z } from 'zod';

export const loginInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .max(254)
      .email()
      .transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(1024),
  })
  .strict();

export type LoginInput = z.infer<typeof loginInputSchema>;

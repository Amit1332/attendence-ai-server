import { z } from "zod";

export const register = z.object({
  body: z.object({
    firstName: z
      .string()
      .min(2, "First name is required"),

    lastName: z
      .string()
      .min(2, "Last name is required"),

    email: z
      .string()
      .email("Invalid email"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),

    role: z.enum([
      "ADMIN",
      "MANAGER",
      "STAFF",
    ]),
  }),
});

export const login = z.object({
  body: z.object({
    email: z.string().email(),

    password: z.string(),
  }),
});
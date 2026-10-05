import { z } from "zod";

/** bcrypt only hashes the first 72 bytes, so two passwords that differ past that point would
 * hash the same. Rejecting longer ones (and anything absurdly long before it reaches bcrypt)
 * keeps every character of a password meaningful. */
export const PASSWORD_MAX_BYTES = 72;

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long.")
  .max(PASSWORD_MAX_BYTES, `Password must be ${PASSWORD_MAX_BYTES} characters or fewer.`)
  .refine((value) => utf8Bytes(value) <= PASSWORD_MAX_BYTES, {
    message: `Password must be ${PASSWORD_MAX_BYTES} bytes or fewer — some characters count as more than one.`,
  })
  .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters long."),
  email: z.email("Please enter a valid email.").trim().toLowerCase(),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email.").trim().toLowerCase(),
  // Login only needs the password non-empty and not absurdly long (bcrypt time is bounded).
  password: z
    .string()
    .min(1, "Password is required.")
    .max(PASSWORD_MAX_BYTES * 4),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email("Please enter a valid email.").trim().toLowerCase(),
});

/** Same password rules as signup, plus a confirmation field. */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is missing its token."),
    password: signupSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

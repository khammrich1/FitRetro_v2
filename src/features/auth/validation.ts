import { z } from "zod";

/** Treats an empty/whitespace string as "not provided" before the inner schema runs — otherwise
 * z.coerce.number() on an empty form field coerces to 0 rather than staying unset. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    schema.optional(),
  );
}

export const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Name must be at least 2 characters long."),
  email: z.email("Please enter a valid email.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  // Optional — used only to seed a default macro goal (Settings > Nutrition) if all four are
  // provided together; signup isn't blocked on any of them.
  sex: optional(z.enum(["male", "female"])),
  age: optional(z.coerce.number().int().positive()),
  heightFeet: optional(z.coerce.number().int().min(0)),
  heightInches: optional(z.coerce.number().min(0).max(11.9)),
  weightLbs: optional(z.coerce.number().positive()),
});

export const loginSchema = z.object({
  email: z.email("Please enter a valid email.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

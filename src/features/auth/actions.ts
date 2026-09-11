"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { signupSchema, loginSchema } from "./validation";
import { createUser, getUserByEmail } from "./queries";

export type AuthFormState =
  | {
      errors?: {
        displayName?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

const SALT_ROUNDS = 10;

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validatedFields = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { displayName, email, password } = validatedFields.data;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ displayName, email, passwordHash });

  await createSession(user.id);
  redirect("/today");
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { email, password } = validatedFields.data;

  const user = await getUserByEmail(email);
  if (!user) {
    return { message: "Invalid email or password." };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { message: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/today");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

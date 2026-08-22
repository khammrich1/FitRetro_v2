"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { signupSchema, loginSchema } from "./validation";
import { createUser, getUserByEmail } from "./queries";
import { recordMeasurement } from "@/features/measurements";
import { calculateDefaultMacroGoals, upsertGoals } from "@/features/nutrition";
import { lbsToKg, feetInchesToCm } from "@/lib/units";

export type AuthFormState =
  | {
      errors?: {
        displayName?: string[];
        email?: string[];
        password?: string[];
        sex?: string[];
        age?: string[];
        heightFeet?: string[];
        heightInches?: string[];
        weightLbs?: string[];
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
    sex: formData.get("sex"),
    age: formData.get("age"),
    heightFeet: formData.get("heightFeet"),
    heightInches: formData.get("heightInches"),
    weightLbs: formData.get("weightLbs"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { displayName, email, password, sex, age, heightFeet, heightInches, weightLbs } =
    validatedFields.data;

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ displayName, email, passwordHash, sex, age });

  // Only seed a default macro goal when every input the formula needs was actually provided —
  // this is a best-effort convenience, not a required step of signing up.
  const heightCm =
    heightFeet !== undefined && heightInches !== undefined
      ? feetInchesToCm(heightFeet, heightInches)
      : undefined;
  const weightKg = weightLbs !== undefined ? lbsToKg(weightLbs) : undefined;

  if (sex && age !== undefined && heightCm !== undefined && weightKg !== undefined) {
    await recordMeasurement({ userId: user.id, recordedAt: new Date(), weightKg, heightCm });
    const goals = calculateDefaultMacroGoals({ sex, age, heightCm, weightKg });
    await upsertGoals({ userId: user.id, ...goals });
  }

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

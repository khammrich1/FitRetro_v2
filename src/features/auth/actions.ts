"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSession, deleteSession } from "@/lib/session";
import { safeNextPath } from "@/lib/safe-redirect";
import { CAMPAIGN_COOKIE_NAME, parseCampaign } from "@/features/billing/campaign";
import { getAppUrl } from "@/lib/app-url";
import { sendEmail, type OutgoingEmail } from "@/lib/email";
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./validation";
import { createUser, getUserByEmail } from "./queries";
import {
  RESET_TOKEN_TTL_MINUTES,
  createPasswordResetToken,
  isResetTokenUsable,
  resetPasswordWithToken,
} from "./password-reset";
import { bumpSessionVersion } from "./session-check";
import { verifySession } from "./dal";
import {
  clearRateLimit,
  consumeRateLimits,
  requestIp,
  tooManyAttemptsMessage,
  type RateLimitRule,
} from "./rate-limit";

export type AuthFormState =
  | {
      errors?: {
        displayName?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
      /** Non-secret values echoed back so a failed submit doesn't wipe the form (React resets
       * uncontrolled fields after every action). Never includes the password. */
      fields?: { displayName?: string; email?: string };
    }
  | undefined;

function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

const SALT_ROUNDS = 10;

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** Abuse limits for the unauthenticated endpoints. Per-IP bounds scripted hammering from one
 * place; per-account bounds a distributed guess at one account. Generous for real people — a
 * typo'd password a few times is nowhere near these.
 *
 * Per-IP limits are deliberately loose: a gym's shared wifi puts dozens of members behind one
 * address, and sticker launch day means many signups from it within an hour. The per-account
 * limits are what actually stop password guessing. */
const loginEmailKey = (email: string) => `login:email:${email}`;

const LIMITS = {
  login: (ip: string, email: string): RateLimitRule[] => [
    { key: `login:ip:${ip}`, limit: 60, windowSeconds: 15 * MINUTE },
    { key: loginEmailKey(email), limit: 10, windowSeconds: 15 * MINUTE },
  ],
  signup: (ip: string): RateLimitRule[] => [
    { key: `signup:ip:${ip}`, limit: 30, windowSeconds: HOUR },
  ],
  resetRequest: (ip: string, email: string): RateLimitRule[] => [
    { key: `reset-request:ip:${ip}`, limit: 10, windowSeconds: HOUR },
    { key: `reset-request:email:${email}`, limit: 3, windowSeconds: HOUR },
  ],
  resetSubmit: (ip: string): RateLimitRule[] => [
    { key: `reset-submit:ip:${ip}`, limit: 10, windowSeconds: 15 * MINUTE },
  ],
};

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = {
    displayName: formText(formData, "displayName"),
    email: formText(formData, "email"),
  };
  const validatedFields = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, fields };
  }

  const { displayName, email, password } = validatedFields.data;

  const limited = await consumeRateLimits(LIMITS.signup(await requestIp()));
  if (!limited.allowed) {
    return { message: tooManyAttemptsMessage(limited), fields };
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return { errors: { email: ["An account with this email already exists."] }, fields };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const signupCampaign = parseCampaign((await cookies()).get(CAMPAIGN_COOKIE_NAME)?.value);
  const user = await createUser({ displayName, email, passwordHash, signupCampaign });

  await createSession(user.id, user.sessionVersion);
  redirect(safeNextPath(formData.get("next")) ?? "/today");
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const fields = { email: formText(formData, "email") };
  const validatedFields = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, fields };
  }

  const { email, password } = validatedFields.data;

  // Counted before the lookup and the bcrypt compare, so a blocked caller costs nothing further.
  const limited = await consumeRateLimits(LIMITS.login(await requestIp(), email));
  if (!limited.allowed) {
    return { message: tooManyAttemptsMessage(limited), fields };
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return { message: "Invalid email or password.", fields };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return { message: "Invalid email or password.", fields };
  }

  // Only failures should accumulate against the account; the IP counter keeps counting.
  await clearRateLimit(loginEmailKey(email));
  await createSession(user.id, user.sessionVersion);
  redirect(safeNextPath(formData.get("next")) ?? "/today");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

/** Signs the account out of every device, including this one. Any cookie issued before now
 * fails the session-version check on its next request. */
export async function logoutEverywhere() {
  const { userId } = await verifySession();
  await bumpSessionVersion(userId);
  await deleteSession();
  redirect("/login?notice=signed_out_everywhere");
}

export type PasswordResetFormState =
  | {
      errors?: {
        email?: string[];
        token?: string[];
        password?: string[];
        confirmPassword?: string[];
      };
      message?: string;
      sent?: boolean;
      fields?: { email?: string };
    }
  | undefined;

/** Identical whether or not the email has an account, so the form can't be used to discover
 * who's signed up. */
const RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we've sent a link to reset your password. It expires in 1 hour — check your spam folder if you don't see it.";

function passwordResetEmail(to: string, resetUrl: string): OutgoingEmail {
  const text = [
    "Someone (hopefully you) asked to reset the password for your FitRetro account.",
    "",
    `Choose a new password here — the link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes:`,
    resetUrl,
    "",
    "If you didn't ask for this, you can ignore this email. Your password won't change.",
  ].join("\n");
  const html = `<p>Someone (hopefully you) asked to reset the password for your FitRetro account.</p>
<p><a href="${resetUrl}">Choose a new password</a> — the link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
<p>If you didn't ask for this, you can ignore this email. Your password won't change.</p>`;
  return { to, subject: "Reset your FitRetro password", text, html };
}

export async function requestPasswordReset(
  _state: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const validatedFields = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      fields: { email: formText(formData, "email") },
    };
  }

  // Over the limit → the same generic reply, just without sending. Counting by email as well as
  // IP keeps a distributed flood from filling one person's inbox.
  const limited = await consumeRateLimits(
    LIMITS.resetRequest(await requestIp(), validatedFields.data.email),
  );
  const user = limited.allowed ? await getUserByEmail(validatedFields.data.email) : null;
  if (user) {
    try {
      const token = await createPasswordResetToken(user.id);
      if (token) {
        // base64url tokens need no escaping in a URL or in the email's HTML attribute.
        const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
        await sendEmail(passwordResetEmail(user.email, resetUrl));
      }
    } catch (error) {
      // Logged for the owner, never surfaced: the reply must not reveal that this account exists.
      console.error(
        `Password reset email failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  return { sent: true, message: RESET_REQUESTED_MESSAGE };
}

export async function resetPassword(
  _state: PasswordResetFormState,
  formData: FormData,
): Promise<PasswordResetFormState> {
  const validatedFields = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { token, password } = validatedFields.data;

  const limited = await consumeRateLimits(LIMITS.resetSubmit(await requestIp()));
  if (!limited.allowed) {
    return { message: tooManyAttemptsMessage(limited) };
  }

  const invalid = {
    message: "This reset link is invalid, expired, or already used. Please request a new one.",
  };
  // Cheap check first so a junk token never costs a bcrypt hash; the real, single-use claim
  // below is still atomic.
  if (!(await isResetTokenUsable(token))) return invalid;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const reset = await resetPasswordWithToken(token, passwordHash);
  if (!reset) return invalid;

  // The reset bumped the session version, signing out every other device; this one gets a
  // cookie carrying the new version.
  await createSession(reset.userId, reset.sessionVersion);
  redirect("/today");
}

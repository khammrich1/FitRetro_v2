import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { passwordResetTokens, users } from "@/db/schema";

export const RESET_TOKEN_TTL_MINUTES = 60;
/** At most one reset email per account per this window, so the form can't be used to flood
 * someone's inbox. Requests inside it get the same generic reply and no new email. */
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a reset token for `userId` and returns the raw token (for the email link) — or null
 * if one was already issued within the cooldown. Only the hash is stored. */
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const cooldownStart = new Date(Date.now() - RESEND_COOLDOWN_MS);
  const [recent] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(eq(passwordResetTokens.userId, userId), gt(passwordResetTokens.createdAt, cooldownStart)),
    )
    .limit(1);
  if (recent) return null;

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  });
  return token;
}

/** Unused and unexpired — lets the reset page say "link expired" before the user types a new
 * password. Not the security check; resetPasswordWithToken re-checks atomically. */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  const [row] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashResetToken(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Spends the token and sets the new password in one transaction. The conditional UPDATE is
 * what makes a link single-use: two concurrent submissions can't both claim it. Every other
 * outstanding token for the user is spent too. Returns the userId, or null if the token is
 * unknown, used or expired. */
export async function resetPasswordWithToken(
  token: string,
  newPasswordHash: string,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [claimed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashResetToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      )
      .returning({ userId: passwordResetTokens.userId });
    if (!claimed) return null;

    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: now })
      .where(eq(users.id, claimed.userId));
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(eq(passwordResetTokens.userId, claimed.userId), isNull(passwordResetTokens.usedAt)),
      );
    return claimed.userId;
  });
}

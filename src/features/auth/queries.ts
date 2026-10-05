import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type NewUser } from "@/db/schema";

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);
  return user ?? null;
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

export async function createUser(input: NewUser) {
  const [user] = await db.insert(users).values(input).returning();
  return user;
}

export async function setUserMacroOrder(userId: string, macroOrder: string) {
  await db.update(users).set({ macroOrder, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setUserBodyStats(
  userId: string,
  input: { sex: "male" | "female"; age: number },
) {
  await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function setUserReadingTopics(userId: string, readingTopics: string) {
  await db.update(users).set({ readingTopics, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Weekday (0 = Sunday … 6 = Saturday) for the progress-pic reminder, or null to turn it off. */
export async function setUserProgressPhotoDay(userId: string, progressPhotoDay: number | null) {
  await db
    .update(users)
    .set({ progressPhotoDay, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Records the customer id only if none is stored yet, and returns whichever id the account ends
 * up with. Two first-time checkouts racing each other can both create a customer in Stripe; the
 * conditional write means only one of them is ever remembered, so the account can't flip between
 * customers. (The Stripe-side duplicate is prevented separately by an idempotency key.) */
export async function setUserStripeCustomerIdIfUnset(
  userId: string,
  stripeCustomerId: string,
): Promise<string | null> {
  const [updated] = await db
    .update(users)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.stripeCustomerId)))
    .returning({ stripeCustomerId: users.stripeCustomerId });
  if (updated) return updated.stripeCustomerId;
  const user = await getUserById(userId);
  return user?.stripeCustomerId ?? null;
}

export async function setUserStripeCustomerId(userId: string, stripeCustomerId: string) {
  await db
    .update(users)
    .set({ stripeCustomerId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

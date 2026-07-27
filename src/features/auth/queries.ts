import { eq, sql } from "drizzle-orm";
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

import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  feedback,
  users,
  type Feedback,
  type FeedbackCategory,
  type FeedbackStatus,
} from "@/db/schema";

export async function createFeedback(
  userId: string,
  category: FeedbackCategory,
  message: string,
): Promise<Feedback> {
  const [row] = await db.insert(feedback).values({ userId, category, message }).returning();
  return row;
}

export async function getFeedbackForUser(userId: string): Promise<Feedback[]> {
  return db
    .select()
    .from(feedback)
    .where(eq(feedback.userId, userId))
    .orderBy(desc(feedback.createdAt));
}

export type FeedbackWithSubmitter = Feedback & { submitterName: string; submitterEmail: string };

/** All feedback across every user, newest first — for the owner-only review page. */
export async function getAllFeedback(): Promise<FeedbackWithSubmitter[]> {
  const rows = await db
    .select({
      feedback,
      submitterName: users.displayName,
      submitterEmail: users.email,
    })
    .from(feedback)
    .innerJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt));

  return rows.map((row) => ({
    ...row.feedback,
    submitterName: row.submitterName,
    submitterEmail: row.submitterEmail,
  }));
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<void> {
  await db.update(feedback).set({ status }).where(eq(feedback.id, id));
}

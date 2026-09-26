import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { progressPhotos, type NewProgressPhoto, type ProgressPhoto } from "@/db/schema";

export type StoredKeys = { storageKey: string; thumbKey: string };

export async function listProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  return db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.userId, userId))
    .orderBy(desc(progressPhotos.takenOn), asc(progressPhotos.createdAt));
}

/** The photo only if it belongs to `userId` — the ownership check every read goes through. */
export async function getProgressPhotoForUser(
  photoId: string,
  userId: string,
): Promise<ProgressPhoto | null> {
  const [photo] = await db
    .select()
    .from(progressPhotos)
    .where(and(eq(progressPhotos.id, photoId), eq(progressPhotos.userId, userId)))
    .limit(1);
  return photo ?? null;
}

/** Records a newly stored photo. Always a new row — a retake of the same pose on the same day is
 * kept alongside the earlier one, never in place of it. */
export async function saveProgressPhoto(
  input: Omit<NewProgressPhoto, "id" | "createdAt">,
): Promise<ProgressPhoto> {
  const [photo] = await db.insert(progressPhotos).values(input).returning();
  return photo;
}

/** Deletes one of the user's photos, returning its object keys (null if it wasn't theirs). */
export async function deleteProgressPhoto(
  photoId: string,
  userId: string,
): Promise<StoredKeys | null> {
  const [deleted] = await db
    .delete(progressPhotos)
    .where(and(eq(progressPhotos.id, photoId), eq(progressPhotos.userId, userId)))
    .returning({ storageKey: progressPhotos.storageKey, thumbKey: progressPhotos.thumbKey });
  return deleted ?? null;
}

/** Deletes every photo from one of the user's check-in days, returning their object keys. */
export async function deleteProgressPhotosForDay(
  userId: string,
  day: string,
): Promise<StoredKeys[]> {
  return db
    .delete(progressPhotos)
    .where(and(eq(progressPhotos.userId, userId), eq(progressPhotos.takenOn, day)))
    .returning({ storageKey: progressPhotos.storageKey, thumbKey: progressPhotos.thumbKey });
}

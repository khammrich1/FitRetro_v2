import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { progressPhotos, type NewProgressPhoto, type ProgressPhoto } from "@/db/schema";

export type StoredKeys = { storageKey: string; thumbKey: string };

export async function listProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  return db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.userId, userId))
    .orderBy(desc(progressPhotos.takenOn), progressPhotos.pose);
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

/** Saves a photo into its (user, day, pose) slot. If that slot already had a photo, it's replaced
 * and the old photo's object keys are returned so the caller can delete those files. */
export async function saveProgressPhoto(
  input: Omit<NewProgressPhoto, "id" | "createdAt">,
): Promise<{ replaced: StoredKeys | null }> {
  return db.transaction(async (tx) => {
    // Lock the slot's current row (if any) so two concurrent retakes can't both lose track of
    // the file they replaced.
    const [previous] = await tx
      .select({ storageKey: progressPhotos.storageKey, thumbKey: progressPhotos.thumbKey })
      .from(progressPhotos)
      .where(
        and(
          eq(progressPhotos.userId, input.userId),
          eq(progressPhotos.takenOn, input.takenOn),
          eq(progressPhotos.pose, input.pose),
        ),
      )
      .for("update");

    await tx
      .insert(progressPhotos)
      .values(input)
      .onConflictDoUpdate({
        target: [progressPhotos.userId, progressPhotos.takenOn, progressPhotos.pose],
        set: {
          storageKey: input.storageKey,
          thumbKey: input.thumbKey,
          width: input.width,
          height: input.height,
          bytes: input.bytes,
          createdAt: sql`now()`,
        },
      });

    return { replaced: previous ?? null };
  });
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

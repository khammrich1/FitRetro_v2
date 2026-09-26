"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import { upsertMeasurementForDay } from "@/features/measurements";
import {
  PROGRESS_POSES,
  UnsupportedPhotoError,
  buildPhotoKeys,
  deleteProgressPhoto,
  deleteProgressPhotosForDay,
  processProgressPhoto,
  saveProgressPhoto,
  type ProcessedPhoto,
  type StoredKeys,
} from "@/features/progress-photos";
import { lbsToKg } from "@/features/workouts/units";
import { toIsoDate } from "@/lib/date";
import { deleteObjects, isObjectStorageConfigured, putObject } from "@/lib/object-storage";
import type { ProgressPhotoPose } from "@/db/schema";

const CM_PER_INCH = 2.54;
/** Per photo. The browser shrinks photos before upload, so a real one is far below this. */
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
/** Whole upload, kept under next.config.ts's 10mb server-action body limit. */
const MAX_TOTAL_BYTES = 9.5 * 1024 * 1024;

export type CheckInState =
  | {
      ok?: string;
      error?: string;
      errors?: Record<string, string[]>;
    }
  | undefined;

const optionalMeasurement = (max: number, label: string) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : (value ?? undefined),
    z.coerce
      .number()
      .positive(`${label} must be greater than 0.`)
      .max(max, `${label} looks too high.`)
      .optional(),
  );

const checkInSchema = z.object({
  takenOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
    .refine((day) => !Number.isNaN(new Date(`${day}T00:00:00`).getTime()), "Pick a date.")
    .refine((day) => day >= "2000-01-01", "Pick a date after 2000."),
  weightLbs: optionalMeasurement(1500, "Weight"),
  waistIn: optionalMeasurement(200, "Waist"),
  bodyFatPercent: optionalMeasurement(99, "Body fat"),
});

/** Tomorrow by the server's clock: a phone's "today" can run ahead of the server's across time
 * zones, so this is the latest date a check-in may be filed under. */
function latestAllowedDay() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toIsoDate(tomorrow);
}

async function deleteFilesQuietly(keys: StoredKeys[]) {
  try {
    await deleteObjects(keys.flatMap((k) => [k.storageKey, k.thumbKey]));
  } catch (error) {
    // The rows are gone, so nothing can reach these files any more; they're just orphaned bytes.
    console.error("Progress photo file cleanup failed", error instanceof Error ? error.name : "");
  }
}

export async function saveCheckInAction(
  _state: CheckInState,
  formData: FormData,
): Promise<CheckInState> {
  const { userId } = await verifySession();

  if (!isObjectStorageConfigured()) {
    return { error: "Photo storage isn't set up yet, so photos can't be saved." };
  }

  const validated = checkInSchema.safeParse({
    takenOn: formData.get("takenOn"),
    weightLbs: formData.get("weightLbs"),
    waistIn: formData.get("waistIn"),
    bodyFatPercent: formData.get("bodyFatPercent"),
  });
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const { takenOn, weightLbs, waistIn, bodyFatPercent } = validated.data;
  if (takenOn > latestAllowedDay()) {
    return { errors: { takenOn: ["That date is in the future."] } };
  }

  const uploads: { pose: ProgressPhotoPose; file: File }[] = [];
  for (const { pose } of PROGRESS_POSES) {
    const file = formData.get(pose);
    if (file instanceof File && file.size > 0) uploads.push({ pose, file });
  }
  if (uploads.length === 0) {
    return { error: "Add at least one photo." };
  }
  if (uploads.some(({ file }) => file.size > MAX_PHOTO_BYTES)) {
    return { error: "One of those photos is too large — use one under 8MB." };
  }
  if (uploads.reduce((sum, { file }) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return { error: "Those photos are too large together — try saving them one at a time." };
  }

  // Process every photo before storing any, so one unreadable file doesn't leave a half-saved
  // check-in behind.
  let processed: { pose: ProgressPhotoPose; photo: ProcessedPhoto }[];
  try {
    processed = await Promise.all(
      uploads.map(async ({ pose, file }) => ({
        pose,
        photo: await processProgressPhoto(Buffer.from(await file.arrayBuffer())),
      })),
    );
  } catch (error) {
    if (error instanceof UnsupportedPhotoError) return { error: error.message };
    throw error;
  }

  let savedCount = 0;
  try {
    for (const { pose, photo } of processed) {
      const keys = buildPhotoKeys(userId);
      await putObject(keys.thumbKey, photo.thumb, "image/jpeg");
      await putObject(keys.storageKey, photo.full, "image/jpeg");
      await saveProgressPhoto({
        userId,
        takenOn,
        pose,
        ...keys,
        width: photo.width,
        height: photo.height,
        bytes: photo.full.length + photo.thumb.length,
      });
      savedCount++;
    }
  } catch (error) {
    console.error("Progress photo upload failed", error instanceof Error ? error.name : "");
    // Photos already saved in this batch stay (their rows point at real files); only the one
    // that failed mid-way could be orphaned, and it's private either way.
    revalidatePath("/progress");
    return {
      error:
        savedCount > 0
          ? "Some photos were saved, but not all — check below and try the rest again."
          : "Couldn't save your photos right now. Please try again in a minute.",
    };
  }

  await upsertMeasurementForDay(userId, takenOn, {
    weightKg: weightLbs !== undefined ? lbsToKg(weightLbs) : undefined,
    waistCm: waistIn !== undefined ? waistIn * CM_PER_INCH : undefined,
    bodyFatPercent,
  });

  revalidatePath("/progress");
  const count = processed.length;
  return { ok: `Saved ${count} photo${count === 1 ? "" : "s"}.` };
}

export async function deleteProgressPhotoAction(photoId: string): Promise<void> {
  const { userId } = await verifySession();
  if (!z.uuid().safeParse(photoId).success) return;
  const keys = await deleteProgressPhoto(photoId, userId);
  if (keys) await deleteFilesQuietly([keys]);
  revalidatePath("/progress");
}

export async function deleteCheckInAction(day: string): Promise<void> {
  const { userId } = await verifySession();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const keys = await deleteProgressPhotosForDay(userId, day);
  await deleteFilesQuietly(keys);
  revalidatePath("/progress");
}

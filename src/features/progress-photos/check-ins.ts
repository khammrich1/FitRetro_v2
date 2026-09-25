import type { ProgressPhotoPose } from "@/db/schema";

export const PROGRESS_POSES: { pose: ProgressPhotoPose; label: string }[] = [
  { pose: "front", label: "Front" },
  { pose: "side", label: "Side" },
  { pose: "back", label: "Back" },
];

/** Object keys for a newly uploaded photo. Namespaced by user and randomly named so a key
 * reveals nothing and never collides — a retake gets fresh keys rather than overwriting. */
export function buildPhotoKeys(userId: string, id: string = crypto.randomUUID()) {
  const base = `progress/${userId}/${id}`;
  return { storageKey: `${base}.jpg`, thumbKey: `${base}_thumb.jpg` };
}

type PhotoLike = { id: string; takenOn: string; pose: ProgressPhotoPose };
type MeasurementLike = {
  day: string;
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPercent: number | null;
};

export type CheckIn<P extends PhotoLike> = {
  day: string;
  photos: Partial<Record<ProgressPhotoPose, P>>;
  measurement: Omit<MeasurementLike, "day"> | null;
};

/** Groups photos into one check-in per day, newest first, attaching that day's measurements.
 * Only days with at least one photo become a check-in — measurement-only days (e.g. a weight
 * entered for goal suggestions) belong to other pages. */
export function groupCheckIns<P extends PhotoLike>(
  photos: P[],
  measurements: MeasurementLike[],
): CheckIn<P>[] {
  const byDay = new Map<string, CheckIn<P>>();
  for (const photo of photos) {
    const checkIn = byDay.get(photo.takenOn) ?? {
      day: photo.takenOn,
      photos: {},
      measurement: null,
    };
    checkIn.photos[photo.pose] = photo;
    byDay.set(photo.takenOn, checkIn);
  }

  for (const { day, ...values } of measurements) {
    const checkIn = byDay.get(day);
    if (!checkIn) continue;
    // Several entries on one day: fill each value from the first entry that has it, so the
    // caller should pass measurements newest first.
    const current = checkIn.measurement ?? { weightKg: null, waistCm: null, bodyFatPercent: null };
    checkIn.measurement = {
      weightKg: current.weightKg ?? values.weightKg,
      waistCm: current.waistCm ?? values.waistCm,
      bodyFatPercent: current.bodyFatPercent ?? values.bodyFatPercent,
    };
  }

  return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

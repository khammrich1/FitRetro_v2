import type { Metadata } from "next";
import { verifySession } from "@/features/auth";
import { getMeasurementHistory } from "@/features/measurements";
import { groupCheckIns, listProgressPhotos } from "@/features/progress-photos";
import { kgToLbs } from "@/features/workouts/units";
import { toIsoDate } from "@/lib/date";
import { isObjectStorageConfigured } from "@/lib/object-storage";
import { CheckInForm } from "./_components/check-in-form";
import { ProgressTabs } from "./_components/progress-tabs";
import { CheckInCard, type CheckInCardData } from "./_components/check-in-card";

export const metadata: Metadata = {
  title: "Progress pics",
  robots: { index: false, follow: false },
};

const CM_PER_INCH = 2.54;

function formatDay(day: string) {
  // Noon UTC + UTC formatting: the label is the stored calendar date, whatever the server's zone.
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function summarize(
  measurement: {
    weightKg: number | null;
    waistCm: number | null;
    bodyFatPercent: number | null;
  } | null,
) {
  if (!measurement) return null;
  const parts = [
    measurement.weightKg != null &&
      `${(Math.round(kgToLbs(measurement.weightKg) * 10) / 10).toString()} lb`,
    measurement.waistCm != null &&
      `${(Math.round((measurement.waistCm / CM_PER_INCH) * 10) / 10).toString()}" waist`,
    measurement.bodyFatPercent != null && `${measurement.bodyFatPercent}% BF`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default async function ProgressPage() {
  const { userId } = await verifySession();
  const storageReady = isObjectStorageConfigured();
  const [photos, measurements] = await Promise.all([
    listProgressPhotos(userId),
    getMeasurementHistory(userId),
  ]);

  const checkIns: CheckInCardData[] = groupCheckIns(
    photos,
    measurements
      .map((m) => ({
        day: toIsoDate(m.recordedAt),
        weightKg: m.weightKg,
        waistCm: m.waistCm,
        bodyFatPercent: m.bodyFatPercent,
      }))
      .reverse(),
  ).map((checkIn) => ({
    day: checkIn.day,
    label: formatDay(checkIn.day),
    measurementSummary: summarize(checkIn.measurement),
    photos: Object.fromEntries(
      Object.entries(checkIn.photos).map(([pose, list]) => [
        pose,
        list.map((photo) => ({ id: photo.id })),
      ]),
    ),
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Progress</h1>
      <ProgressTabs active="photos" />
      <p className="text-sm text-muted-foreground">
        The scale only tells part of the story. A quick front, side and back photo every week or so
        shows the changes you can&apos;t see day to day. Your photos are private: only you can see
        them, they&apos;re never shared or sent to AI, and location data is stripped before
        they&apos;re stored.
      </p>

      {storageReady ? (
        <CheckInForm todayIso={toIsoDate(new Date())} />
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Photo storage isn&apos;t set up on this server yet, so new photos can&apos;t be saved.
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Timeline</h2>
        {checkIns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No check-ins yet. Take your first set today — future you will be glad you did.
          </p>
        ) : (
          checkIns.map((checkIn) => <CheckInCard key={checkIn.day} checkIn={checkIn} />)
        )}
      </section>
    </div>
  );
}

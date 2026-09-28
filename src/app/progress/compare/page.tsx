import type { Metadata } from "next";
import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getMeasurementHistory } from "@/features/measurements";
import {
  PROGRESS_POSES,
  compareMeasurements,
  describeGap,
  groupCheckIns,
  listProgressPhotos,
  pickComparison,
} from "@/features/progress-photos";
import type { ProgressPhotoPose } from "@/db/schema";
import { formatIsoDay, toIsoDate } from "@/lib/date";
import { ProgressTabs } from "../_components/progress-tabs";
import { CompareControls } from "./_components/compare-controls";

export const metadata: Metadata = {
  title: "Compare progress pics",
  robots: { index: false, follow: false },
};

function isPose(value: string | undefined): value is ProgressPhotoPose {
  return PROGRESS_POSES.some(({ pose }) => pose === value);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; pose?: string }>;
}) {
  const { userId } = await verifySession();
  const params = await searchParams;
  const [photos, measurements] = await Promise.all([
    listProgressPhotos(userId),
    getMeasurementHistory(userId),
  ]);

  const checkIns = groupCheckIns(
    photos,
    measurements
      .map((m) => ({
        day: toIsoDate(m.recordedAt),
        weightKg: m.weightKg,
        waistCm: m.waistCm,
        bodyFatPercent: m.bodyFatPercent,
      }))
      .reverse(),
  );
  const pose: ProgressPhotoPose = isPose(params.pose) ? params.pose : "front";
  const picked = pickComparison(
    checkIns.map((c) => c.day),
    params,
  );

  const header = (
    <>
      <h1 className="retro-heading text-2xl font-bold text-foreground">Progress</h1>
      <ProgressTabs active="photos" />
      <Link href="/progress" className="self-start text-sm text-accent underline">
        ← Back to timeline
      </Link>
    </>
  );

  if (!picked) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
        {header}
        <p className="text-sm text-muted-foreground">
          Comparing needs at least two check-ins. Take another set next week and come back — the
          first side-by-side is the best part.
        </p>
      </div>
    );
  }

  const byDay = new Map(checkIns.map((c) => [c.day, c]));
  const sides = [picked.from, picked.to].map((day) => {
    const checkIn = byDay.get(day)!;
    // The latest take of that pose that day (retakes are all kept; the last is usually the one).
    const takes = checkIn.photos[pose] ?? [];
    return { day, label: formatIsoDay(day), photo: takes[takes.length - 1] ?? null, checkIn };
  });
  const changes = compareMeasurements(sides[0].checkIn.measurement, sides[1].checkIn.measurement);
  const poseLabel = PROGRESS_POSES.find((p) => p.pose === pose)!.label;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      {header}

      <CompareControls
        days={checkIns.map((c) => ({ day: c.day, label: formatIsoDay(c.day) }))}
        from={picked.from}
        to={picked.to}
        pose={pose}
      />

      <p className="text-center text-sm font-medium text-accent">
        {describeGap(picked.from, picked.to)}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {sides.map(({ day, label, photo }, index) => (
          <figure key={`${index}-${day}`} className="flex min-w-0 flex-col gap-1">
            {photo ? (
              <a
                href={`/progress/photos/${photo.id}`}
                target="_blank"
                rel="noopener"
                className="block aspect-[3/4] overflow-hidden rounded-md border border-border"
              >
                {/* Plain <img>: photos are owner-only, which next/image's optimizer can't fetch. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/progress/photos/${photo.id}`}
                  alt={`${poseLabel} progress photo, ${label}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-dashed border-border p-2 text-center text-xs text-muted-foreground">
                No {poseLabel.toLowerCase()} photo this day
              </div>
            )}
            <figcaption className="text-center text-xs">
              <span className="font-medium">{index === 0 ? "Before" : "After"}</span> · {label}
            </figcaption>
          </figure>
        ))}
      </div>

      {changes.length > 0 ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-1 font-medium"> </th>
              <th className="py-1 font-medium">Before</th>
              <th className="py-1 font-medium">After</th>
              <th className="py-1 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <td className="py-1.5 font-medium">{row.label}</td>
                <td className="py-1.5">{row.from}</td>
                <td className="py-1.5">{row.to}</td>
                <td className="py-1.5 text-right font-semibold text-accent">{row.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Add weight or waist to both check-ins to see the numbers change too.
        </p>
      )}
    </div>
  );
}

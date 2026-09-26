"use client";

import { useRouter } from "next/navigation";
import { PROGRESS_POSES } from "@/features/progress-photos/check-ins";

const selectClass =
  "w-full rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Changing any picker navigates straight to the new comparison (it's all in the URL, so a
 * comparison can be bookmarked). */
export function CompareControls({
  days,
  from,
  to,
  pose,
}: {
  /** Check-in days, newest first, each with its display label. */
  days: { day: string; label: string }[];
  from: string;
  to: string;
  pose: string;
}) {
  const router = useRouter();

  function go(next: { from?: string; to?: string; pose?: string }) {
    const params = new URLSearchParams({ from, to, pose, ...next });
    router.push(`/progress/compare?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="flex min-w-0 flex-col gap-1 text-xs">
        Before
        <select value={from} onChange={(e) => go({ from: e.target.value })} className={selectClass}>
          {days.map(({ day, label }) => (
            <option key={day} value={day}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 flex-col gap-1 text-xs">
        After
        <select value={to} onChange={(e) => go({ to: e.target.value })} className={selectClass}>
          {days.map(({ day, label }) => (
            <option key={day} value={day}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 flex min-w-0 flex-col gap-1 text-xs">
        Pose
        <select value={pose} onChange={(e) => go({ pose: e.target.value })} className={selectClass}>
          {PROGRESS_POSES.map(({ pose: value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

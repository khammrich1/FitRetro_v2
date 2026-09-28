"use client";

import { useState, useTransition } from "react";
import { deleteCheckInAction, deleteProgressPhotoAction } from "@/app/progress/actions";
import { PROGRESS_POSES } from "@/features/progress-photos/check-ins";
import type { ProgressPhotoPose } from "@/db/schema";

export type CheckInCardData = {
  day: string;
  /** Pre-formatted on the server, e.g. "Sun, Sep 21, 2026". */
  label: string;
  /** Every photo of each pose that day, oldest first — retakes are all kept. */
  photos: Partial<Record<ProgressPhotoPose, { id: string }[]>>;
  measurementSummary: string | null;
};

function photoUrl(id: string, size?: "thumb") {
  return `/progress/photos/${id}${size ? "?size=thumb" : ""}`;
}

export function CheckInCard({ checkIn }: { checkIn: CheckInCardData }) {
  const [confirming, setConfirming] = useState<"day" | string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      setConfirming(null);
    });
  }

  // One tile per photo (a pose retaken that day shows every take), or a placeholder tile for a
  // pose with none.
  const tiles = PROGRESS_POSES.flatMap<{ key: string; label: string; id: string | null }>(
    ({ pose, label }) => {
      const photos = checkIn.photos[pose] ?? [];
      if (photos.length === 0) return [{ key: pose, label, id: null }];
      return photos.map((photo, index) => ({
        key: photo.id,
        label: photos.length > 1 ? `${label} ${index + 1}` : label,
        id: photo.id,
      }));
    },
  );
  const photoCount = tiles.filter((tile) => tile.id).length;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-semibold text-foreground">{checkIn.label}</h3>
        {checkIn.measurementSummary && (
          <span className="text-sm text-muted-foreground">{checkIn.measurementSummary}</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map(({ key, label, id }) => (
          <div key={key} className="flex min-w-0 flex-col gap-1">
            {id ? (
              <a
                href={photoUrl(id)}
                target="_blank"
                rel="noopener"
                className="block aspect-[3/4] overflow-hidden rounded-md border border-border"
              >
                {/* Plain <img>: next/image's optimizer fetches server-side without the
                    viewer's session cookie, so it can't load owner-only photos. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(id, "thumb")}
                  alt={`${label} progress photo, ${checkIn.label}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </a>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                No {label.toLowerCase()}
              </div>
            )}
            <div className="flex items-center justify-between gap-1 text-xs">
              <span className="truncate">{label}</span>
              {id &&
                (confirming === id ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteProgressPhotoAction(id))}
                    className="font-medium text-danger disabled:opacity-50"
                  >
                    Delete?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(id)}
                    className="text-muted-foreground hover:text-danger"
                  >
                    Remove
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {confirming === "day" ? (
          <>
            <span className="text-muted-foreground">
              Permanently delete all {photoCount} photo{photoCount === 1 ? "" : "s"} from this day?
              Measurements are kept.
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => deleteCheckInAction(checkIn.day))}
              className="font-medium text-danger disabled:opacity-50"
            >
              {pending ? "Deleting..." : "Delete photos"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming("day")}
            className="text-muted-foreground hover:text-danger"
          >
            Delete check-in
          </button>
        )}
      </div>
    </article>
  );
}

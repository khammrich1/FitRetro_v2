import Link from "next/link";
import type { ProgressPhotoReminder } from "@/features/progress-photos/reminder";

export function ProgressPhotoReminderCard({
  reminder,
}: {
  reminder: NonNullable<ProgressPhotoReminder>;
}) {
  return (
    <Link
      href="/progress"
      className="flex items-center gap-3 rounded-lg border border-accent/60 bg-card p-4 hover:border-accent"
    >
      <span aria-hidden className="text-2xl leading-none">
        📸
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold text-foreground">
          {reminder.kind === "due"
            ? "Progress pic day"
            : `It's been ${reminder.daysSince} days since your last progress pics`}
        </span>
        <span className="text-sm text-muted-foreground">
          {reminder.kind === "due"
            ? "Front, side, back — takes a minute. Future you will want these."
            : "A quick front, side and back keeps the timeline going."}
        </span>
      </span>
      <span className="ml-auto shrink-0 text-sm font-medium text-accent">Take them →</span>
    </Link>
  );
}

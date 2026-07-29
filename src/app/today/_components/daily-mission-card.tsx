"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { MissionItemWithCompletion } from "@/features/daily-mission";
import { toggleMissionItemCompletionAction } from "@/app/daily-mission/actions";

function MissionItemRow({ item, dayIso }: { item: MissionItemWithCompletion; dayIso: string }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleMissionItemCompletionAction(item.id, dayIso);
    });
  }

  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-background p-2 text-sm">
      <input
        type="checkbox"
        checked={item.completedToday}
        onChange={handleToggle}
        disabled={pending}
        className="h-4 w-4 accent-primary"
      />
      <span className={item.completedToday ? "text-muted-foreground line-through" : ""}>
        {item.label}
      </span>
    </li>
  );
}

export function DailyMissionCard({
  items,
  dayIso,
}: {
  items: MissionItemWithCompletion[];
  dayIso: string;
}) {
  const completedCount = items.filter((item) => item.completedToday).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-accent bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Today&apos;s mission
        </h2>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not set up yet — define it in{" "}
          <Link href="/settings/daily-mission" className="text-accent underline">
            Settings &gt; Daily mission
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <MissionItemRow key={item.id} item={item} dayIso={dayIso} />
          ))}
        </ul>
      )}
    </div>
  );
}

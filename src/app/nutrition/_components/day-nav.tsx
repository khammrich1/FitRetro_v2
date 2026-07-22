"use client";

import { usePathname, useRouter } from "next/navigation";

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DayNav({ date }: { date: Date }) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(target: Date) {
    router.push(`${pathname}?date=${toIsoDate(target)}`);
  }

  function goToOffset(days: number) {
    const target = new Date(date);
    target.setDate(target.getDate() + days);
    goTo(target);
  }

  const iso = toIsoDate(date);
  const isToday = iso === toIsoDate(new Date());

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <button
        type="button"
        onClick={() => goToOffset(-1)}
        className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
      >
        ← Prev
      </button>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={iso}
          onChange={(event) => {
            if (event.target.value) goTo(new Date(`${event.target.value}T00:00:00`));
          }}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {!isToday && (
          <button
            type="button"
            onClick={() => goTo(new Date())}
            className="text-xs text-accent underline"
          >
            Today
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => goToOffset(1)}
        className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
      >
        Next →
      </button>
    </div>
  );
}

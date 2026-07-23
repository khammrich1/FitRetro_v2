"use client";

import { usePathname, useRouter } from "next/navigation";

/** Parses/formats "YYYY-MM-DD" using UTC-anchored arithmetic only, so day math never depends on
 * the server's or browser's local timezone (which previously caused off-by-one navigation). */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DayNav({ dayIso, todayIso }: { dayIso: string; todayIso: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function goTo(iso: string) {
    router.push(`${pathname}?date=${iso}`);
  }

  function goToOffset(days: number) {
    const target = parseIsoDate(dayIso);
    target.setUTCDate(target.getUTCDate() + days);
    goTo(toIsoDate(target));
  }

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
          value={dayIso}
          onChange={(event) => {
            if (event.target.value) goTo(event.target.value);
          }}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {dayIso !== todayIso && (
          <button
            type="button"
            onClick={() => goTo(todayIso)}
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

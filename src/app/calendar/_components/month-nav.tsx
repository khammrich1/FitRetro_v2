"use client";

import { useRouter } from "next/navigation";

/** Same-route, search-param-only navigation needs router.push() rather than a plain <Link> —
 * matching DayNav (src/components/ui/day-nav.tsx), which hit the same issue: Link's client-side
 * navigation doesn't reliably pick up a new searchParams value when only the query differs. */
export function MonthNav({
  monthIso,
  prevMonthIso,
  nextMonthIso,
  currentMonthIso,
  monthLabel,
}: {
  monthIso: string;
  prevMonthIso: string;
  nextMonthIso: string;
  currentMonthIso: string;
  monthLabel: string;
}) {
  const router = useRouter();

  function goTo(month: string) {
    router.push(`/calendar?month=${month}`);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <button
        type="button"
        onClick={() => goTo(prevMonthIso)}
        className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
      >
        ← Prev
      </button>
      <div className="flex items-center gap-2">
        <span className="retro-heading text-sm font-semibold text-primary">{monthLabel}</span>
        {monthIso !== currentMonthIso && (
          <button
            type="button"
            onClick={() => goTo(currentMonthIso)}
            className="text-xs text-accent underline"
          >
            This month
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => goTo(nextMonthIso)}
        className="rounded-md border border-border px-3 py-1 text-sm hover:border-accent hover:text-accent"
      >
        Next →
      </button>
    </div>
  );
}

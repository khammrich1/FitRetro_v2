"use client";

import { useTransition } from "react";
import type { PeptideTemplate, PeptideFrequency } from "@/db/schema";
import type { PeptideLogWithTemplate } from "@/features/peptides";
import { logPeptideDoseAction, deletePeptideLogAction } from "@/app/peptides/actions";

/** Frequencies with a fixed day-count interval, used to compute when a peptide is next due.
 * Twice/three-times weekly and as-needed don't map to a single clean interval, so those are
 * always available to log rather than guessing which days they apply. */
const FREQUENCY_INTERVAL_DAYS: Partial<Record<PeptideFrequency, number>> = {
  daily: 1,
  every_other_day: 2,
  weekly: 7,
};

/** Parses/diffs "YYYY-MM-DD" using UTC-anchored arithmetic, so day counts don't depend on the
 * server's or browser's local timezone. */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(fromIso: string, toIso: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / msPerDay);
}

function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/** Whether `template` is due on `dayIso`, given the last day (if any) it was logged. */
function isDue(template: PeptideTemplate, lastLoggedIso: string | undefined, dayIso: string) {
  const intervalDays = FREQUENCY_INTERVAL_DAYS[template.frequency];
  if (!intervalDays) return true;
  if (!lastLoggedIso) return true;
  return daysBetween(lastLoggedIso, dayIso) >= intervalDays;
}

function LoggedPeptideRow({ log }: { log: PeptideLogWithTemplate }) {
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      await deletePeptideLogAction(log.id);
    });
  }

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-background p-2 text-sm">
      <span>
        {log.template.name} — {log.template.doseAmount}
        {log.template.doseUnit}
      </span>
      <button
        onClick={handleRemove}
        disabled={pending}
        className="text-xs text-muted-foreground hover:text-danger"
      >
        Remove
      </button>
    </li>
  );
}

export function PeptideSection({
  dayIso,
  templates,
  logs,
  mostRecentLogDates,
}: {
  dayIso: string;
  templates: PeptideTemplate[];
  logs: PeptideLogWithTemplate[];
  mostRecentLogDates: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();

  function handleAdd(templateId: string) {
    startTransition(async () => {
      await logPeptideDoseAction(templateId, dayIso);
    });
  }

  const dueTemplates = templates.filter((template) =>
    isDue(template, mostRecentLogDates[template.id], dayIso),
  );
  const notDueTemplates = templates.filter(
    (template) => !isDue(template, mostRecentLogDates[template.id], dayIso),
  );

  return (
    <div className="flex flex-col gap-3">
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No peptides yet — add one in Settings &gt; Peptides.
        </p>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          {dueTemplates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Add a dose:
              </span>
              {dueTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleAdd(template.id)}
                  disabled={pending}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {template.name} ({template.doseAmount}
                  {template.doseUnit})
                </button>
              ))}
            </div>
          )}
          {notDueTemplates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Not due yet:
              </span>
              {notDueTemplates.map((template) => {
                const intervalDays = FREQUENCY_INTERVAL_DAYS[template.frequency];
                const lastLogged = mostRecentLogDates[template.id];
                const nextDue =
                  intervalDays && lastLogged ? addDays(lastLogged, intervalDays) : undefined;
                return (
                  <span
                    key={template.id}
                    title={nextDue ? `Next due ${formatDate(nextDue)}` : undefined}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground opacity-60"
                  >
                    {template.name}
                    {nextDue ? ` (due ${formatDate(nextDue)})` : ""}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No doses logged for this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.map((log) => (
            <LoggedPeptideRow key={log.id} log={log} />
          ))}
        </ul>
      )}
    </div>
  );
}

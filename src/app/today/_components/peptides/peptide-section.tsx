"use client";

import { useState, useTransition } from "react";
import type { PeptideTemplate, PeptideFrequency } from "@/db/schema";
import type { LevelEstimate, PeptideLogWithTemplate } from "@/features/peptides";
import { peptideFrequencyLabel } from "@/features/peptides/frequency";
import { describeLoggedDose } from "@/features/peptides/logs";
import { computeDrawVolumeMl, mlToSyringeUnits } from "@/features/peptides/reconstitution";
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

/** Formats a 24-hour "HH:MM" string (from a native time input) as e.g. "8:00 AM". */
function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
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

  // The log's own snapshot, so editing the template later never changes what this row says.
  const dose = describeLoggedDose(log);
  const takenAt = log.administeredAt
    ? new Date(log.administeredAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-background p-2 text-sm">
      <span>
        {dose.name} — {dose.doseAmount}
        {dose.doseUnit}
        <span className="text-muted-foreground">
          {takenAt ? ` · ${takenAt}` : " · time not recorded"}
          {log.template.archivedAt ? " · archived peptide" : ""}
        </span>
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
  todayIso,
  templates,
  logs,
  mostRecentLogDates,
  currentLevelByTemplate,
}: {
  dayIso: string;
  todayIso: string;
  templates: PeptideTemplate[];
  logs: PeptideLogWithTemplate[];
  mostRecentLogDates: Record<string, string>;
  currentLevelByTemplate: Record<string, LevelEstimate>;
}) {
  const [pending, startTransition] = useTransition();
  // Logging a past day: "now" would be wrong, so ask for the time (optional — blank means the
  // dose is recorded with an unknown time and left out of the level estimate).
  const isPastDay = dayIso !== todayIso;
  const [time, setTime] = useState("");

  function handleAdd(templateId: string) {
    startTransition(async () => {
      await logPeptideDoseAction(templateId, dayIso, isPastDay ? time : null);
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
      {templates.length === 0 && logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No peptides yet — add one in Settings &gt; Peptides.
        </p>
      ) : templates.length === 0 ? null : (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          {dueTemplates.length > 0 && isPastDay && (
            <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              Time taken (optional, so the level estimate can count it):
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </label>
          )}
          {dueTemplates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Add a dose:
              </span>
              {dueTemplates.map((template) => {
                const formattedTime = formatTime(template.preferredTime);
                const drawMl = computeDrawVolumeMl({
                  vialAmountMg: template.vialAmountMg,
                  bacWaterMl: template.bacWaterMl,
                  doseAmount: template.doseAmount,
                  doseUnit: template.doseUnit,
                });
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleAdd(template.id)}
                    disabled={pending}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {template.name}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({peptideFrequencyLabel(template.frequency)})
                    </span>{" "}
                    ({template.doseAmount}
                    {template.doseUnit}
                    {formattedTime ? `, ${formattedTime}` : ""}
                    {drawMl !== null
                      ? `, draw ${drawMl.toFixed(2)}mL/${mlToSyringeUnits(drawMl).toFixed(0)}u`
                      : ""}
                    )
                  </button>
                );
              })}
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

      {Object.keys(currentLevelByTemplate).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Level in body:
          </span>
          {templates
            .filter((template) => template.id in currentLevelByTemplate)
            .map((template) => (
              <span
                key={template.id}
                className="rounded-full border border-border px-3 py-1 text-xs text-accent"
              >
                {template.name} ~{Math.round(currentLevelByTemplate[template.id].percent)}%
                {currentLevelByTemplate[template.id].unknownRecentDoses > 0 &&
                  ` (${currentLevelByTemplate[template.id].unknownRecentDoses} recent dose${
                    currentLevelByTemplate[template.id].unknownRecentDoses === 1 ? "" : "s"
                  } with no time not counted)`}
              </span>
            ))}
          <span className="w-full text-xs text-muted-foreground">
            Rough estimate from the half-life you entered — not medical guidance. Doses logged
            without a time aren&apos;t included.
          </span>
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

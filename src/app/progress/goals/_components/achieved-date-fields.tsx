"use client";

import { useState } from "react";
import type { DatePrecision } from "@/db/schema";

const OPTIONS: { value: DatePrecision; label: string }[] = [
  { value: "day", label: "Exact day" },
  { value: "month", label: "Month" },
  { value: "year", label: "Just the year" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const fieldClass =
  "w-full rounded-md border border-border bg-background px-2 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

/** "When did you do it?" — at whatever precision the user actually remembers. Submits
 * achievedPrecision plus the one matching field (achievedDay / achievedMonth / achievedYear). */
export function AchievedDateFields({
  todayIso,
  defaultPrecision = "day",
  defaultDate,
  error,
}: {
  todayIso: string;
  defaultPrecision?: DatePrecision;
  /** A stored achievedOn ("YYYY-MM-DD"), when editing. */
  defaultDate?: string | null;
  error?: string;
}) {
  const [precision, setPrecision] = useState<DatePrecision>(defaultPrecision);
  const [year, month] = (defaultDate ?? todayIso).split("-");
  const [monthPart, setMonthPart] = useState(month);
  const [monthYear, setMonthYear] = useState(year);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">When did you do it?</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="achievedPrecision"
              value={option.value}
              checked={precision === option.value}
              onChange={() => setPrecision(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {precision === "day" && (
        <input
          type="date"
          name="achievedDay"
          aria-label="Day you did it"
          defaultValue={defaultDate && defaultPrecision === "day" ? defaultDate : todayIso}
          max={todayIso}
          required
          className={`${fieldClass} self-start`}
        />
      )}
      {precision === "month" && (
        // A month dropdown + year box rather than <input type="month">, which Firefox and
        // desktop Safari render as a bare text field. Submitted as one "YYYY-MM" value.
        <div className="flex gap-2">
          <select
            aria-label="Month you did it"
            value={monthPart}
            onChange={(event) => setMonthPart(event.target.value)}
            className={`${fieldClass} w-auto`}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="number"
            aria-label="Year of that month"
            inputMode="numeric"
            value={monthYear}
            onChange={(event) => setMonthYear(event.target.value)}
            min={1900}
            max={Number(todayIso.slice(0, 4))}
            required
            className={`${fieldClass} w-24`}
          />
          <input type="hidden" name="achievedMonth" value={`${monthYear}-${monthPart}`} />
        </div>
      )}
      {precision === "year" && (
        <input
          type="number"
          name="achievedYear"
          aria-label="Year you did it"
          inputMode="numeric"
          defaultValue={year}
          min={1900}
          max={Number(todayIso.slice(0, 4))}
          required
          className={`${fieldClass} w-28 self-start`}
        />
      )}
      <span className="text-xs text-muted-foreground">
        Don&apos;t remember the exact day? The month or just the year still counts.
      </span>
      {error && <span className="text-sm text-danger">{error}</span>}
    </fieldset>
  );
}

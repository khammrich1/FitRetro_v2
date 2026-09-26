import { z } from "zod";
import type { DatePrecision, GoalStatus } from "@/db/schema";
import { isValidIsoDay, periodEnd, resolveAchievedDate } from "./dates";

export type GoalValues = {
  title: string;
  notes: string | null;
  status: GoalStatus;
  startedOn: string | null;
  targetDate: string | null;
  achievedOn: string | null;
  achievedPrecision: DatePrecision | null;
};

export type GoalFieldErrors = Partial<
  Record<"title" | "notes" | "startedOn" | "targetDate" | "achieved", string[]>
>;

const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : (value ?? null);

const optionalDay = (message: string) =>
  z.preprocess(blankToNull, z.string().refine(isValidIsoDay, message).nullable());

const goalSchema = z.object({
  title: z
    .string({ error: "Name your goal." })
    .trim()
    .min(1, "Name your goal.")
    .max(120, "Keep it under 120 characters."),
  notes: z.preprocess(
    blankToNull,
    z.string().trim().max(1000, "Keep notes under 1,000 characters.").nullable(),
  ),
  startedOn: optionalDay("Pick a valid start date."),
  targetDate: optionalDay("Pick a valid target date."),
});

type FormLike = { get(name: string): FormDataEntryValue | null };

const text = (form: FormLike, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value : null;
};

/** Reads just the "when did you do it?" fields shared by the goal form and the quick "I did it"
 * form. */
export function parseAchievedFields(form: FormLike, todayIso: string) {
  return resolveAchievedDate(
    {
      precision: text(form, "achievedPrecision"),
      day: text(form, "achievedDay"),
      month: text(form, "achievedMonth"),
      year: text(form, "achievedYear"),
    },
    todayIso,
  );
}

/** Validates the add/edit goal form. A goal marked "already achieved" needs a when (at whatever
 * precision the user remembers); an active goal with no start date starts today. */
export function parseGoalForm(
  form: FormLike,
  todayIso: string,
): { values: GoalValues } | { errors: GoalFieldErrors } {
  const parsed = goalSchema.safeParse({
    title: text(form, "title") ?? undefined,
    notes: text(form, "notes"),
    startedOn: text(form, "startedOn"),
    targetDate: text(form, "targetDate"),
  });
  const errors: GoalFieldErrors = parsed.success
    ? {}
    : (z.flattenError(parsed.error).fieldErrors as GoalFieldErrors);

  const achieved = text(form, "achieved") === "on";
  const when = achieved ? parseAchievedFields(form, todayIso) : null;
  if (when && "error" in when) errors.achieved = [when.error];

  if (!parsed.success || Object.keys(errors).length > 0) return { errors };

  const { title, notes, targetDate } = parsed.data;
  let { startedOn } = parsed.data;
  if (!achieved && !startedOn) startedOn = todayIso;

  if (startedOn && startedOn > todayIso) {
    return { errors: { startedOn: ["Start date can't be in the future."] } };
  }
  if (startedOn && targetDate && targetDate < startedOn) {
    return { errors: { targetDate: ["Target date is before the start date."] } };
  }
  if (
    when &&
    !("error" in when) &&
    startedOn &&
    periodEnd(when.achievedOn, when.precision) < startedOn
  ) {
    return { errors: { achieved: ["That's before you started this goal."] } };
  }

  return {
    values: {
      title,
      notes,
      status: achieved ? "achieved" : "active",
      startedOn,
      targetDate,
      achievedOn: when && !("error" in when) ? when.achievedOn : null,
      achievedPrecision: when && !("error" in when) ? when.precision : null,
    },
  };
}

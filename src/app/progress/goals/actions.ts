"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/features/auth";
import {
  createGoal,
  deleteGoal,
  getGoalForUser,
  markGoalAchieved,
  parseAchievedFields,
  parseGoalForm,
  periodEnd,
  updateGoal,
  type GoalFieldErrors,
} from "@/features/goals";
import { toIsoDate } from "@/lib/date";

export type GoalFormState =
  | {
      ok?: string;
      error?: string;
      errors?: GoalFieldErrors;
      /** Bumped on every successful save so the form knows to reset/close. */
      savedAt?: number;
    }
  | undefined;

const isUuid = (value: string) => z.uuid().safeParse(value).success;

function revalidateGoals() {
  revalidatePath("/progress/goals");
}

export async function createGoalAction(
  _state: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const { userId } = await verifySession();
  const parsed = parseGoalForm(formData, toIsoDate(new Date()));
  if ("errors" in parsed) return { errors: parsed.errors };

  await createGoal(userId, parsed.values);
  revalidateGoals();
  return {
    ok: parsed.values.status === "achieved" ? "Milestone logged. 🏆" : "Goal added.",
    savedAt: Date.now(),
  };
}

export async function updateGoalAction(
  goalId: string,
  _state: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const { userId } = await verifySession();
  if (!isUuid(goalId)) return { error: "That goal no longer exists." };
  const parsed = parseGoalForm(formData, toIsoDate(new Date()));
  if ("errors" in parsed) return { errors: parsed.errors };

  const updated = await updateGoal(goalId, userId, parsed.values);
  if (!updated) return { error: "That goal no longer exists." };
  revalidateGoals();
  return { ok: "Saved.", savedAt: Date.now() };
}

/** The quick "I did it!" on an active goal: just asks when. */
export async function achieveGoalAction(
  goalId: string,
  _state: GoalFormState,
  formData: FormData,
): Promise<GoalFormState> {
  const { userId } = await verifySession();
  if (!isUuid(goalId)) return { error: "That goal no longer exists." };
  const goal = await getGoalForUser(goalId, userId);
  if (!goal) return { error: "That goal no longer exists." };

  const when = parseAchievedFields(formData, toIsoDate(new Date()));
  if ("error" in when) return { errors: { achieved: [when.error] } };
  if (goal.startedOn && periodEnd(when.achievedOn, when.precision) < goal.startedOn) {
    return { errors: { achieved: ["That's before you started this goal."] } };
  }

  await markGoalAchieved(goalId, userId, when.achievedOn, when.precision);
  revalidateGoals();
  return { ok: "Milestone unlocked. 🏆", savedAt: Date.now() };
}

export async function deleteGoalAction(goalId: string): Promise<void> {
  const { userId } = await verifySession();
  if (!isUuid(goalId)) return;
  await deleteGoal(goalId, userId);
  revalidateGoals();
}

import type { Goal } from "@/db/schema";
import { daysBetween, daysUntil, describeTimeTaken, formatAchieved, formatDay } from "./dates";

export type GoalPresentation = { headline: string; detail: string | null; overdue?: boolean };

function plural(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** The two lines of text a goal or milestone card shows, worked out as of `todayIso`. */
export function presentGoal(goal: Goal, todayIso: string): GoalPresentation {
  if (goal.status === "achieved" && goal.achievedOn && goal.achievedPrecision) {
    const when = formatAchieved(goal.achievedOn, goal.achievedPrecision);
    const headline =
      goal.achievedPrecision === "day" ? `Achieved ${when}` : `Achieved sometime in ${when}`;
    const taken = describeTimeTaken(goal.startedOn, goal.achievedOn, goal.achievedPrecision);
    const parts = [
      goal.startedOn && `Goal since ${formatDay(goal.startedOn)}`,
      taken && `took ${taken}`,
    ].filter(Boolean);
    return { headline, detail: parts.length > 0 ? parts.join(" · ") : null };
  }

  const started = goal.startedOn ?? todayIso;
  const headline = `Day ${daysBetween(started, todayIso) + 1} · since ${formatDay(started)}`;
  if (!goal.targetDate) return { headline, detail: null };

  const left = daysUntil(goal.targetDate, todayIso);
  const target = formatDay(goal.targetDate);
  if (left > 0) return { headline, detail: `Target ${target} · ${plural(left, "day")} to go` };
  if (left === 0) return { headline, detail: `Target is today` };
  return {
    headline,
    detail: `Target was ${target} · still in it — adjust the date or keep pushing`,
    overdue: true,
  };
}

/** Active goals first by nearest target (none last), then oldest start; milestones newest first. */
export function sortGoals(goals: Goal[]) {
  const active = goals
    .filter((goal) => goal.status === "active")
    .sort(
      (a, b) =>
        (a.targetDate ?? "9999").localeCompare(b.targetDate ?? "9999") ||
        (a.startedOn ?? "").localeCompare(b.startedOn ?? "") ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  const milestones = goals
    .filter((goal) => goal.status === "achieved")
    .sort(
      (a, b) =>
        (b.achievedOn ?? "").localeCompare(a.achievedOn ?? "") ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    );
  return { active, milestones };
}

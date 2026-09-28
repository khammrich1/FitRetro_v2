import type { Metadata } from "next";
import { verifySession } from "@/features/auth";
import { listGoals, presentGoal, sortGoals } from "@/features/goals";
import type { Goal } from "@/db/schema";
import { toIsoDate } from "@/lib/date";
import { ProgressTabs } from "../_components/progress-tabs";
import { GoalForm } from "./_components/goal-form";
import { GoalCard, MilestoneCard, type GoalCardData } from "./_components/goal-cards";

export const metadata: Metadata = {
  title: "Goals & milestones",
  robots: { index: false, follow: false },
};

function toCardData(goal: Goal, todayIso: string): GoalCardData {
  return {
    id: goal.id,
    title: goal.title,
    notes: goal.notes,
    status: goal.status,
    startedOn: goal.startedOn,
    targetDate: goal.targetDate,
    achievedOn: goal.achievedOn,
    achievedPrecision: goal.achievedPrecision,
    ...presentGoal(goal, todayIso),
  };
}

export default async function GoalsPage() {
  const { userId } = await verifySession();
  const todayIso = toIsoDate(new Date());
  const { active, milestones } = sortGoals(await listGoals(userId));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Progress</h1>
      <ProgressTabs active="goals" />
      <p className="text-sm text-muted-foreground">
        Set a goal, then mark it the day you hit it — your first muscle up, a 300lb deadlift, a 5K
        without stopping. Already did something worth remembering but don&apos;t know the exact day?
        Log the month, or just the year. It still counts.
      </p>

      {milestones.length > 0 && (
        <p className="text-sm font-medium text-accent">
          🏆 {milestones.length} milestone{milestones.length === 1 ? "" : "s"} unlocked
          {active.length > 0 && ` · ${active.length} in progress`}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Add a goal</h2>
        <GoalForm todayIso={todayIso} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Working on</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing in progress. What&apos;s the next thing you want to be able to do?
          </p>
        ) : (
          active.map((goal) => (
            <GoalCard key={goal.id} goal={toCardData(goal, todayIso)} todayIso={todayIso} />
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Milestones</h2>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No milestones yet. Hit a goal — or log one you&apos;ve already crushed.
          </p>
        ) : (
          milestones.map((goal) => (
            <MilestoneCard key={goal.id} goal={toCardData(goal, todayIso)} todayIso={todayIso} />
          ))
        )}
      </section>
    </div>
  );
}

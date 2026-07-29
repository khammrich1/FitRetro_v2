import type { DailyScore } from "@/lib/daily-score";

const SINGULAR_LABELS: Record<string, string> = {
  "Meals logged": "Meal logged",
  "Routine steps": "Routine step",
  "Workout sets": "Workout set",
  "Workouts completed": "Workout completed",
  "Peptide doses": "Peptide dose",
  "Notes added": "Note added",
};

export function DailyScoreCard({ score }: { score: DailyScore }) {
  const loggedRows = score.breakdown.filter((row) => row.count > 0);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Today&apos;s Score
        </h2>
        <span className="retro-heading text-2xl font-bold text-primary">{score.total}</span>
      </div>
      {loggedRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing logged yet today — your score fills in as you go.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {loggedRows
            .map((row) => {
              const label = row.count === 1 ? (SINGULAR_LABELS[row.label] ?? row.label) : row.label;
              return `${row.count} ${label.toLowerCase()}`;
            })
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

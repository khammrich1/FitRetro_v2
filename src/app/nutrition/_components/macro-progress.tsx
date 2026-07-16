function ProgressBar({ label, consumed, goal }: { label: string; consumed: number; goal: number }) {
  const percent = goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {Math.round(consumed)} / {Math.round(goal)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-border">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MacroProgress({
  consumed,
  goal,
}: {
  consumed: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
  goal: {
    dailyCalories: number;
    dailyProteinGrams: number;
    dailyCarbsGrams: number;
    dailyFatGrams: number;
  } | null;
}) {
  if (!goal) {
    return (
      <p className="text-sm text-muted-foreground">
        Set your daily macro targets below to track progress.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
        Today&apos;s progress
      </h2>
      <ProgressBar label="Calories" consumed={consumed.calories} goal={goal.dailyCalories} />
      <ProgressBar label="Protein" consumed={consumed.proteinGrams} goal={goal.dailyProteinGrams} />
      <ProgressBar label="Carbs" consumed={consumed.carbsGrams} goal={goal.dailyCarbsGrams} />
      <ProgressBar label="Fat" consumed={consumed.fatGrams} goal={goal.dailyFatGrams} />
    </div>
  );
}

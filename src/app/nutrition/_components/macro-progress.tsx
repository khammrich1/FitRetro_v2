function ProgressBar({ label, consumed, goal }: { label: string; consumed: number; goal: number }) {
  const percent = goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-zinc-500">
          {Math.round(consumed)} / {Math.round(goal)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10">
        <div className="h-2 rounded-full bg-foreground" style={{ width: `${percent}%` }} />
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
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Set your daily macro targets below to track progress.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <h2 className="font-semibold">Today&apos;s progress</h2>
      <ProgressBar label="Calories" consumed={consumed.calories} goal={goal.dailyCalories} />
      <ProgressBar label="Protein" consumed={consumed.proteinGrams} goal={goal.dailyProteinGrams} />
      <ProgressBar label="Carbs" consumed={consumed.carbsGrams} goal={goal.dailyCarbsGrams} />
      <ProgressBar label="Fat" consumed={consumed.fatGrams} goal={goal.dailyFatGrams} />
    </div>
  );
}

import { MACRO_LABELS, type MacroKey } from "@/lib/macro-order";
import Link from "next/link";

function ProgressBar({ label, consumed, goal }: { label: string; consumed: number; goal: number }) {
  const isOver = consumed > goal;
  const percent = goal > 0 ? Math.min(100, Math.round((consumed / goal) * 100)) : 0;
  const remaining = Math.round(Math.abs(goal - consumed));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={isOver ? "font-medium text-danger" : "text-muted-foreground"}>
          {Math.round(consumed)} / {Math.round(goal)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-border">
        <div
          className={`h-2 rounded-full ${isOver ? "bg-danger" : "bg-accent"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs ${isOver ? "font-medium text-danger" : "text-muted-foreground"}`}>
        {isOver ? `${remaining} over` : `${remaining} left`}
      </span>
    </div>
  );
}

export function MacroProgress({
  consumed,
  goal,
  macroOrder,
}: {
  consumed: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
  goal: {
    dailyCalories: number;
    dailyProteinGrams: number;
    dailyCarbsGrams: number;
    dailyFatGrams: number;
  } | null;
  macroOrder: MacroKey[];
}) {
  if (!goal) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
        <h2 className="text-base font-semibold text-foreground">Make nutrition your own</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your daily targets to see how your meals add up. You can keep logging without them.
        </p>
        <Link
          href="/settings/nutrition"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Set nutrition targets{" "}
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      </div>
    );
  }

  const consumedByKey: Record<MacroKey, number> = {
    fat: consumed.fatGrams,
    carbs: consumed.carbsGrams,
    protein: consumed.proteinGrams,
  };
  const goalByKey: Record<MacroKey, number> = {
    fat: goal.dailyFatGrams,
    carbs: goal.dailyCarbsGrams,
    protein: goal.dailyProteinGrams,
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Progress</h2>
      <ProgressBar label="Calories" consumed={consumed.calories} goal={goal.dailyCalories} />
      {macroOrder.map((key) => (
        <ProgressBar
          key={key}
          label={MACRO_LABELS[key]}
          consumed={consumedByKey[key]}
          goal={goalByKey[key]}
        />
      ))}
    </div>
  );
}

import type { DailyScore } from "@/lib/daily-score";

export function DailyScoreCard({
  score,
  isToday = true,
}: {
  score: DailyScore;
  isToday?: boolean;
}) {
  const loggedRows = score.breakdown.filter((row) => row.count > 0);
  const sections = [
    { label: "Nutrition", points: score.byTab.nutrition },
    { label: "Move", points: score.byTab.move },
    { label: "Routine", points: score.byTab.routine },
  ];

  return (
    <section
      aria-label="Daily activity summary"
      className="overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {isToday ? "Today’s momentum" : "Day’s activity"}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {loggedRows.length === 0
              ? "Start wherever you like. Your first entry is a small win."
              : "Your entries are adding up. Every day has its own pace."}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-4xl font-semibold tabular-nums tracking-tight text-accent">
            {score.total}
          </span>
          <span className="text-xs text-muted-foreground">activity points</span>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
        {sections.map(({ label, points }) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {points}
              <span className="ml-1 text-xs font-normal text-muted-foreground">pts</span>
            </dd>
          </div>
        ))}
      </dl>
      {loggedRows.length > 0 && (
        <details className="mt-4 border-t border-border pt-3">
          <summary className="cursor-pointer rounded text-xs font-medium text-muted-foreground hover:text-foreground">
            See what contributed
          </summary>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {loggedRows.map((row) => (
              <li key={row.label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {row.label} <span className="text-foreground">× {row.count}</span>
                </span>
                <span className="tabular-nums text-accent">+{row.points} pts</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Points reflect entries, not a health rating or a daily target.
          </p>
        </details>
      )}
    </section>
  );
}

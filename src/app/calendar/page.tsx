import Link from "next/link";
import { verifySession } from "@/features/auth";
import { toIsoDate, parseMonthParam, toMonthIso, shiftMonth } from "@/lib/date";
import { getDailyScoreForDay } from "@/features/daily-score";
import { MonthNav } from "./_components/month-nav";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { userId } = await verifySession();
  const { month: monthParam } = await searchParams;
  const current = parseMonthParam(monthParam);
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentMonthIso = toMonthIso({ year: today.getFullYear(), month: today.getMonth() + 1 });

  const daysInMonth = new Date(current.year, current.month, 0).getDate();
  const firstWeekday = new Date(current.year, current.month - 1, 1).getDay();
  const days = Array.from(
    { length: daysInMonth },
    (_, i) => new Date(current.year, current.month - 1, i + 1),
  );

  const scores = await Promise.all(days.map((day) => getDailyScoreForDay(userId, day)));

  const prevMonthIso = toMonthIso(shiftMonth(current, -1));
  const nextMonthIso = toMonthIso(shiftMonth(current, 1));
  const monthIso = toMonthIso(current);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Calendar</h1>
      <p className="text-sm text-muted-foreground">
        Your daily score for each day this month — click a day to jump into it on{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>
        .
      </p>

      <MonthNav
        monthIso={monthIso}
        prevMonthIso={prevMonthIso}
        nextMonthIso={nextMonthIso}
        currentMonthIso={currentMonthIso}
        monthLabel={`${MONTH_LABELS[current.month - 1]} ${current.year}`}
      />

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((day, i) => {
          const dayIso = toIsoDate(day);
          const isToday = dayIso === todayIso;
          return (
            <Link
              key={dayIso}
              href={`/today?date=${dayIso}`}
              className={
                "flex flex-col items-center gap-1 rounded-md border p-2 text-sm hover:border-accent " +
                (isToday ? "border-2 border-accent" : "border-border")
              }
            >
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="retro-heading font-bold text-primary">{scores[i].total}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

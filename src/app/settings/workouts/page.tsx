import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getSplitForUser, getTemplatesForUser } from "@/features/workouts";
import { SplitSchedule } from "./_components/split-schedule";
import { TemplatesSection } from "./_components/templates-section";

export default async function WorkoutsSettingsPage() {
  const { userId } = await verifySession();

  const [splitDays, templates] = await Promise.all([
    getSplitForUser(userId),
    getTemplatesForUser(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Workout settings</h1>
      <p className="text-sm text-muted-foreground">
        Set your weekly split schedule and build reusable exercise templates here. Log workouts and
        load a template for the day on the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>
      <SplitSchedule splitDays={splitDays} />
      <TemplatesSection templates={templates} />
    </div>
  );
}

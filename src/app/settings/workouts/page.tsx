import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getSplitCycleForUser, getTemplatesForUser } from "@/features/workouts";
import { SplitCycle } from "./_components/split-cycle";
import { TemplatesSection } from "./_components/templates-section";

export default async function WorkoutsSettingsPage() {
  const { userId } = await verifySession();

  const [cycleDays, templates] = await Promise.all([
    getSplitCycleForUser(userId),
    getTemplatesForUser(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Workout settings</h1>
      <p className="text-sm text-muted-foreground">
        Build your workout rotation and reusable exercise templates here. Log workouts and start
        from a template on the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>
      <SplitCycle cycleDays={cycleDays} />
      <TemplatesSection templates={templates} />
    </div>
  );
}

import { verifySession } from "@/features/auth";
import { getMissionItemsForUser } from "@/features/daily-mission";
import { MissionList } from "./_components/mission-list";

export default async function DailyMissionSettingsPage() {
  const { userId } = await verifySession();
  const items = await getMissionItemsForUser(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Daily mission</h1>
      <p className="text-sm text-muted-foreground">
        Define the handful of things that make today a win — this always shows at the top of the
        Today page, checkable day to day.
      </p>
      <MissionList items={items} />
    </div>
  );
}

import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getGoals } from "@/features/nutrition";
import { GoalsForm } from "./_components/goals-form";

export default async function NutritionSettingsPage() {
  const { userId } = await verifySession();
  const goal = await getGoals(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Nutrition goals</h1>
      <p className="text-sm text-muted-foreground">
        Set your daily macro targets here — they apply every day until you change them. Track
        progress against them on the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>
      <GoalsForm goal={goal} />
    </div>
  );
}

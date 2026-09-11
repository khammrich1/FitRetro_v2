import Link from "next/link";
import { getCurrentUser, verifySession } from "@/features/auth";
import { getGoals } from "@/features/nutrition";
import { parseMacroOrder } from "@/lib/macro-order";
import { GoalsForm } from "./_components/goals-form";
import { MacroOrderCard } from "./_components/macro-order-card";
import { SuggestedGoalCard } from "./_components/suggested-goal-card";

export default async function NutritionSettingsPage() {
  const { userId } = await verifySession();
  const [goal, user] = await Promise.all([getGoals(userId), getCurrentUser()]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Nutrition settings</h1>
      <p className="text-sm text-muted-foreground">
        Set your daily macro targets here. Track progress and log meals on the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>
      <GoalsForm goal={goal} macroOrder={parseMacroOrder(user?.macroOrder)} />
      <SuggestedGoalCard />
      <MacroOrderCard initialOrder={parseMacroOrder(user?.macroOrder)} />
    </div>
  );
}

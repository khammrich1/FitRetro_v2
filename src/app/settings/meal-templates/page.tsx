import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getMealTemplatesForUser } from "@/features/nutrition";
import { MealTemplatesSection } from "./_components/meal-templates-section";

export default async function MealTemplatesSettingsPage() {
  const { userId } = await verifySession();
  const mealTemplates = await getMealTemplatesForUser(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Meal templates</h1>
      <p className="text-sm text-muted-foreground">
        Save meals you eat often here. Log meals and templates on the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>
      <MealTemplatesSection templates={mealTemplates} />
    </div>
  );
}

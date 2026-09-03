import Link from "next/link";
import { verifySession } from "@/features/auth";
import { listPantryItems } from "@/features/pantry";
import { PantryItemForm } from "./_components/pantry-item-form";
import { PantryList } from "./_components/pantry-list";

export default async function PantryPage() {
  const { userId } = await verifySession();
  const items = await listPantryItems(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Pantry</h1>
      <p className="text-sm text-muted-foreground">
        What you have on hand — food suggestions on the Nutrition page will prioritize using these
        when they fit your remaining macros. Cooking in bulk? Use{" "}
        <Link href="/meal-prep" className="text-accent underline">
          Meal Prep
        </Link>{" "}
        to add a portion here with its macros already calculated.
      </p>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Your items</h2>
        <PantryList items={items} />
      </div>

      <PantryItemForm />
    </div>
  );
}

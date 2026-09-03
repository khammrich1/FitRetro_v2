import { verifySession } from "@/features/auth";
import { MealPrepForm } from "./_components/meal-prep-form";

export default async function MealPrepPage() {
  await verifySession();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Meal Prep</h1>
      <p className="text-sm text-muted-foreground">
        Enter everything that went into a batch, set how many portions it makes, and add one portion
        to your Pantry with its macros already calculated — then log it in one tap from the Prepped
        meals section on Today.
      </p>
      <MealPrepForm />
    </div>
  );
}

import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getSupplementTemplatesForUser } from "@/features/supplements";
import { SupplementTemplateCard } from "./_components/supplement-template-card";
import { NewSupplementForm } from "./_components/new-supplement-form";

export default async function SupplementsSettingsPage() {
  const { userId } = await verifySession();
  const templates = await getSupplementTemplatesForUser(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Supplements</h1>
      <p className="text-sm text-muted-foreground">
        Define the supplements you take here — name, dose, and how often. Log a dose on a specific
        day from the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No supplements yet — add one below.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template) => (
            <SupplementTemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      <NewSupplementForm />
    </div>
  );
}

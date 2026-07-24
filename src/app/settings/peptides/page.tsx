import Link from "next/link";
import { verifySession } from "@/features/auth";
import { getPeptideTemplatesForUser } from "@/features/peptides";
import { PeptideTemplateCard } from "./_components/peptide-template-card";
import { NewPeptideForm } from "./_components/new-peptide-form";

export default async function PeptidesSettingsPage() {
  const { userId } = await verifySession();
  const templates = await getPeptideTemplatesForUser(userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Peptides</h1>
      <p className="text-sm text-muted-foreground">
        Define the peptides you take here — name, dose, and how often. Add a dose to a specific day
        from the{" "}
        <Link href="/today" className="text-accent underline">
          Today
        </Link>{" "}
        page.
      </p>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No peptides yet — add one below.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((template) => (
            <PeptideTemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      <NewPeptideForm />
    </div>
  );
}

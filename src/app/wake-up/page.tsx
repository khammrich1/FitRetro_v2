import { requireAdmin } from "@/features/auth";

const SUNO_SHARE_URL = "https://suno.com/s/IyOEQXlsdzNJ9MHz";
const SUNO_EMBED_URL = "https://suno.com/embed/IyOEQXlsdzNJ9MHz";

export default async function WakeUpPage() {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Wake Up</h1>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <iframe
          src={SUNO_EMBED_URL}
          title="Wake Up song"
          className="h-[160px] w-full"
          allow="autoplay"
          loading="lazy"
        />
      </div>
      <a
        href={SUNO_SHARE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm text-accent underline hover:text-primary"
      >
        Open in Suno
      </a>
    </div>
  );
}

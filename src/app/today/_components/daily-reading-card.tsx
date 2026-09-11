"use client";

import { useState } from "react";
import type { DailyReading } from "@/db/schema";
import { READING_TOPIC_LABELS } from "@/lib/reading-topics";

function ReadingChip({ reading }: { reading: DailyReading }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = reading.body.split(/\n+/).filter((paragraph) => paragraph.trim() !== "");

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm hover:border-accent"
      >
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="font-medium text-foreground">{reading.title}</span>{" "}
          <span className="text-xs text-muted-foreground">
            ({READING_TOPIC_LABELS[reading.topic]} · {reading.readMinutes} min)
          </span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-3 rounded-lg border-2 border-accent bg-card p-4 text-sm leading-6">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
    </li>
  );
}

export function DailyReadingCard({ readings }: { readings: DailyReading[] }) {
  if (readings.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Daily Reader</h2>
      <ul className="flex flex-col gap-2">
        {readings.map((reading) => (
          <ReadingChip key={reading.id} reading={reading} />
        ))}
      </ul>
    </section>
  );
}

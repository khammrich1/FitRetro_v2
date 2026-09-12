"use client";

import { useState } from "react";
import type { DailyReading } from "@/db/schema";
import { READING_TOPIC_LABELS } from "@/lib/reading-topics";

export function DailyReadingCard({ reading }: { reading: DailyReading | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!reading) return null;

  const paragraphs = reading.body.split(/\n+/).filter((paragraph) => paragraph.trim() !== "");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Daily Reader</h2>
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
        <div className="flex flex-col gap-3 rounded-lg border-2 border-accent bg-card p-4 text-sm leading-6">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import type { DailyReading } from "@/db/schema";
import { READING_TOPIC_LABELS } from "@/lib/reading-topics";

const BACKGROUNDS = ["white", "black", "gray"] as const;
type Background = (typeof BACKGROUNDS)[number];

const TEXT_SIZES = ["small", "medium", "large"] as const;
type TextSize = (typeof TEXT_SIZES)[number];

const BACKGROUND_LABELS: Record<Background, string> = {
  white: "White",
  black: "Black",
  gray: "Gray",
};

const BACKGROUND_CLASSES: Record<Background, string> = {
  white: "bg-white text-black",
  black: "bg-black text-white",
  gray: "bg-neutral-500 text-white",
};

const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-lg",
};

const BACKGROUND_STORAGE_KEY = "dailyReader:background";
const TEXT_SIZE_STORAGE_KEY = "dailyReader:textSize";

// A purely cosmetic reading preference — unlike macroOrder/readingTopics it never affects what's
// fetched or rendered server-side, so it lives in localStorage per device rather than a DB
// column + settings page.
function readStoredOption<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored && (allowed as readonly string[]).includes(stored) ? (stored as T) : fallback;
  } catch {
    return fallback;
  }
}

function ToggleGroup<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (option: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`rounded-full border px-2 py-0.5 text-xs ${
            value === option
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border text-muted-foreground hover:border-accent"
          }`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function DailyReadingCard({ reading }: { reading: DailyReading | null }) {
  const [expanded, setExpanded] = useState(false);
  const [background, setBackground] = useState<Background>(() =>
    readStoredOption(BACKGROUND_STORAGE_KEY, BACKGROUNDS, "gray"),
  );
  const [textSize, setTextSize] = useState<TextSize>(() =>
    readStoredOption(TEXT_SIZE_STORAGE_KEY, TEXT_SIZES, "medium"),
  );

  if (!reading) return null;

  const paragraphs = reading.body.split(/\n+/).filter((paragraph) => paragraph.trim() !== "");

  function handleBackgroundChange(next: Background) {
    setBackground(next);
    try {
      localStorage.setItem(BACKGROUND_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — the choice still applies for this view.
    }
  }

  function handleTextSizeChange(next: TextSize) {
    setTextSize(next);
    try {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — the choice still applies for this view.
    }
  }

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
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Background</span>
              <ToggleGroup
                options={BACKGROUNDS}
                labels={BACKGROUND_LABELS}
                value={background}
                onChange={handleBackgroundChange}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Text size</span>
              <ToggleGroup
                options={TEXT_SIZES}
                labels={TEXT_SIZE_LABELS}
                value={textSize}
                onChange={handleTextSizeChange}
              />
            </div>
          </div>
          <div
            className={`flex flex-col gap-3 rounded-lg border-2 border-accent p-4 leading-7 ${BACKGROUND_CLASSES[background]} ${TEXT_SIZE_CLASSES[textSize]}`}
          >
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

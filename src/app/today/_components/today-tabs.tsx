"use client";

import { useSyncExternalStore, type ReactNode } from "react";

type TabId = "nutrition" | "move" | "routine";

const STORAGE_KEY = "today:tab";

const TABS: { id: TabId; label: string }[] = [
  { id: "nutrition", label: "Nutrition" },
  { id: "move", label: "Move" },
  { id: "routine", label: "Routine" },
];

function isTabId(value: string | null): value is TabId {
  return value === "nutrition" || value === "move" || value === "routine";
}

const listeners = new Set<() => void>();

/** In-memory fallback for when sessionStorage itself is unavailable (e.g. private browsing
 * blocks it outright) — without this, tab clicks would silently do nothing in that case. */
let inMemoryTab: TabId | null = null;

function subscribeToTab(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Never called during SSR (React uses getServerTabSnapshot for that render), so reading
 * sessionStorage here is safe. */
function getTabSnapshot(): TabId {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (isTabId(stored)) return stored;
  } catch {
    // sessionStorage unavailable — fall through to the in-memory fallback below.
  }
  return inMemoryTab ?? "nutrition";
}

function getServerTabSnapshot(): TabId {
  return "nutrition";
}

function setActiveTab(tab: TabId) {
  inMemoryTab = tab;
  try {
    sessionStorage.setItem(STORAGE_KEY, tab);
  } catch {
    // sessionStorage unavailable — the in-memory fallback above still drives the UI.
  }
  listeners.forEach((listener) => listener());
}

/** Panels are rendered server-side once (in page.tsx) and handed in as already-built React
 * nodes — switching tabs only toggles which one is shown, it never re-fetches. */
export function TodayTabs({
  nutrition,
  move,
  routine,
}: {
  nutrition: ReactNode;
  move: ReactNode;
  routine: ReactNode;
}) {
  const active = useSyncExternalStore(subscribeToTab, getTabSnapshot, getServerTabSnapshot);
  const panels: Record<TabId, ReactNode> = { nutrition, move, routine };

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 rounded-lg border border-border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              active === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-6">{panels[active]}</div>
    </div>
  );
}

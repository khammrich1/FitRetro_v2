"use client";

import {
  Activity,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";

type TabId = "nutrition" | "move" | "routine";

const STORAGE_KEY = "today:tab";

const TABS: { id: TabId; label: string; detail: string }[] = [
  { id: "nutrition", label: "Nutrition", detail: "Meals & hydration" },
  { id: "move", label: "Move", detail: "Your training" },
  { id: "routine", label: "Routine", detail: "Daily rituals" },
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
 * nodes — switching tabs only toggles which one is shown, it never re-fetches. A panel mounts
 * the first time it's shown and then stays mounted (hidden) so half-filled forms survive a
 * switch; the panels never visited cost nothing. */
export function TodayTabs({
  dayIso,
  nutrition,
  move,
  routine,
}: {
  dayIso: string;
  nutrition: ReactNode;
  move: ReactNode;
  routine: ReactNode;
}) {
  const active = useSyncExternalStore(subscribeToTab, getTabSnapshot, getServerTabSnapshot);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const panels: Record<TabId, ReactNode> = { nutrition, move, routine };
  const [visited, setVisited] = useState<TabId[]>([]);

  /** Switch tabs, remembering both the one being left and the one being opened. The one being
   * left may have been restored from storage on hydration without passing through here. */
  function select(tab: TabId) {
    setVisited((seen) =>
      [active, tab].reduce<TabId[]>((acc, id) => (acc.includes(id) ? acc : [...acc, id]), seen),
    );
    setActiveTab(tab);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    select(TABS[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Daily tracking"
        className="sticky top-2 z-10 flex gap-1 rounded-2xl border border-border bg-card p-1.5 shadow-lg"
      >
        {TABS.map((tab, index) => (
          <button
            id={`${id}-tab-${tab.id}`}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`min-w-0 flex-1 rounded-xl px-2 py-3 text-sm font-semibold transition-colors motion-reduce:transition-none ${
              active === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="block">{tab.label}</span>
            <span className="mt-0.5 hidden text-[11px] font-normal opacity-80 sm:block">
              {tab.detail}
            </span>
          </button>
        ))}
      </div>
      {TABS.filter((tab) => tab.id === active || visited.includes(tab.id)).map((tab) => (
        <Activity key={`${dayIso}-${tab.id}`} mode={active === tab.id ? "visible" : "hidden"}>
          <div
            role="tabpanel"
            id={`${id}-panel-${tab.id}`}
            aria-labelledby={`${id}-tab-${tab.id}`}
            tabIndex={0}
            className="flex flex-col gap-6 rounded-xl"
          >
            {panels[tab.id]}
          </div>
        </Activity>
      ))}
    </div>
  );
}

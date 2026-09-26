import Link from "next/link";

const TABS = [
  { id: "photos", label: "Photos", href: "/progress" },
  { id: "goals", label: "Goals & milestones", href: "/progress/goals" },
] as const;

/** Switches between the two Progress pages. Real links (not client tabs), so each page keeps its
 * own URL and can be bookmarked or linked to directly. */
export function ProgressTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav
      aria-label="Progress sections"
      className="flex gap-1 rounded-lg border border-border bg-card p-1"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? "page" : undefined}
          className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-medium ${
            active === tab.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

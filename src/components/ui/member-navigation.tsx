"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

const PRIMARY = [
  { href: "/today", label: "Today" },
  { href: "/calendar", label: "Calendar" },
  { href: "/progress", label: "Progress" },
  { href: "/pantry", label: "Pantry" },
];
const SECONDARY = [
  { href: "/meal-prep", label: "Meal Prep" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
  { href: "/feedback", label: "Feedback" },
];

export function MemberNavigation({
  displayName,
  owner,
  logoutAction,
}: {
  displayName: string;
  owner: boolean;
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const secondary = owner
    ? [
        ...SECONDARY,
        { href: "/feedback/review", label: "Review Feedback" },
        { href: "/wake-up", label: "Wake Up" },
      ]
    : SECONDARY;
  const activeHref = [...PRIMARY, ...secondary]
    .filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const active = (href: string) => href === activeHref;

  function close() {
    if (disclosure.current) disclosure.current.open = false;
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <div className="flex min-w-0 flex-1 items-center gap-1" aria-label="Main sections">
        {PRIMARY.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-2 text-sm font-medium sm:px-3 ${active(href) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <details
        ref={disclosure}
        className="relative shrink-0"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
            disclosure.current?.querySelector("summary")?.focus();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
        }}
      >
        <summary
          className={`flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-xl px-3 text-sm font-medium [&::-webkit-details-marker]:hidden ${secondary.some(({ href }) => active(href)) ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground"}`}
        >
          More{" "}
          <span aria-hidden="true" className="text-[10px]">
            ▾
          </span>
        </summary>
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-2xl border border-border bg-card p-2 shadow-2xl">
          <p
            className="truncate border-b border-border px-3 py-3 text-sm font-semibold"
            title={displayName}
          >
            {displayName}
          </p>
          {secondary.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={close}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${active(href) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-background"}`}
            >
              {label}
            </Link>
          ))}
          <form action={logoutAction} className="mt-1 border-t border-border pt-1">
            <button
              type="submit"
              className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-muted-foreground hover:bg-background hover:text-foreground"
            >
              Log out
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}

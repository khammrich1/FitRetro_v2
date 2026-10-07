import Link from "next/link";
import { getCurrentUser, isOwner, logout } from "@/features/auth";
import { TimeZoneSync } from "./timezone-sync";
import { MemberNavigation } from "./member-navigation";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav
      aria-label="Main navigation"
      className="border-b border-border bg-background/80 px-4 py-3 sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Link
          href={user ? "/today" : "/"}
          className="retro-heading py-2 text-sm font-bold text-primary"
        >
          FitRetro
        </Link>
        {user ? (
          <>
            <MemberNavigation
              displayName={user.displayName}
              owner={isOwner(user.email)}
              logoutAction={logout}
            />
            <TimeZoneSync current={user.timezone} />
          </>
        ) : (
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="font-medium text-foreground hover:text-primary">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

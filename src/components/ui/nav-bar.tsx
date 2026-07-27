import Link from "next/link";
import { getCurrentUser, logout } from "@/features/auth";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/" className="retro-heading text-sm font-bold text-primary">
        FitRetro
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/today" className="font-medium text-accent">
              Today
            </Link>
            <Link href="/pantry" className="font-medium text-accent">
              Pantry
            </Link>
            <Link href="/settings" className="font-medium text-accent">
              Settings
            </Link>
            <Link href="/help" className="font-medium text-accent">
              Help
            </Link>
            {user.isAdmin && (
              <Link href="/wake-up" className="font-medium text-accent">
                Wake Up
              </Link>
            )}
            <span className="text-muted-foreground">{user.displayName}</span>
            <form action={logout}>
              <button
                type="submit"
                className="font-medium text-foreground underline hover:text-primary"
              >
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="font-medium text-foreground hover:text-primary">
              Log in
            </Link>
            <Link
              href="/signup"
              className="font-medium text-primary underline hover:text-primary-hover"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

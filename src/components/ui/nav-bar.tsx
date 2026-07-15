import Link from "next/link";
import { getCurrentUser, logout } from "@/features/auth";

export async function NavBar() {
  const user = await getCurrentUser();

  return (
    <nav className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
      <Link href="/" className="font-semibold text-black dark:text-zinc-50">
        FitRetro
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <Link href="/nutrition" className="font-medium">
              Nutrition
            </Link>
            <span className="text-zinc-500">{user.displayName}</span>
            <form action={logout}>
              <button type="submit" className="font-medium underline">
                Log out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="font-medium">
              Log in
            </Link>
            <Link href="/signup" className="font-medium underline">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

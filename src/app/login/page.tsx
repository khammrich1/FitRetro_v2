import { safeNextPath } from "@/lib/safe-redirect";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <LoginForm next={safeNextPath(next)} />;
}

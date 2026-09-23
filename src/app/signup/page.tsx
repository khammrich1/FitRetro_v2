import { safeNextPath } from "@/lib/safe-redirect";
import { SignupForm } from "./_components/signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <SignupForm next={safeNextPath(next)} />;
}

import Link from "next/link";
import { requireOwner } from "@/features/auth";
import { getAllFeedback } from "@/features/feedback";
import { getOwnerOpsSummary, getPageViewTrafficLast7Days } from "@/features/ops";

function formatDay(day: string | undefined): string {
  return day ?? "—";
}

export default async function OpsPage() {
  await requireOwner();

  const [summary, traffic, feedback] = await Promise.all([
    getOwnerOpsSummary(),
    getPageViewTrafficLast7Days(),
    getAllFeedback(),
  ]);
  const openFeedbackCount = feedback.filter((item) => item.status === "open").length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <h1 className="retro-heading text-2xl font-bold text-foreground">Ops</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total users", value: summary.totalUsers },
          { label: "New last 7d", value: summary.newLast7Days },
          { label: "Active last 7d", value: summary.activeLast7Days },
          { label: "Active today", value: summary.activeToday },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-accent">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Account roster
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {summary.roster.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{user.displayName}</td>
                  <td className="px-3 py-2 break-all">{user.email}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {user.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{user.isAdmin ? "Yes" : ""}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {user.lastActivity
                      ? `${formatDay(user.lastActivity.day)} (${user.lastActivity.source})`
                      : "No activity yet"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">
          Traffic — last 7 days
        </h2>
        {traffic.length === 0 ? (
          <p className="text-sm text-muted-foreground">No page views recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Hits</th>
                  <th className="px-3 py-2">Unique auth users</th>
                  <th className="px-3 py-2">Auth / unauth</th>
                </tr>
              </thead>
              <tbody>
                {traffic.map((row) => (
                  <tr key={row.path} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.path}</td>
                    <td className="px-3 py-2">{row.hits}</td>
                    <td className="px-3 py-2">{row.uniqueAuthUsers}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.authHits} / {row.unauthHits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Feedback</h2>
        <Link href="/feedback/review" className="text-sm text-accent underline hover:text-primary">
          Review feedback ({openFeedbackCount} open)
        </Link>
      </section>
    </div>
  );
}

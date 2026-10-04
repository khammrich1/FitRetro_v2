import { getUserById, isOwner } from "@/features/auth";
import { getAiUsageTotalForDay, reserveAiUsage } from "./queries";

// Flat cap across every AI-powered action combined (macro/workout estimation, suggestions,
// recipes, photo scans, note cleanup) — not cost-weighted per feature. Chosen as generous
// headroom for normal personal use while bounding worst-case API cost per user per day. Tune
// this based on real usage/cost data once there's more than one paying account.
export const DAILY_AI_ACTION_LIMIT = 20;

/** Site-wide ceiling across every account, the owner included — a cost backstop so that no
 * number of accounts (or one runaway owner session) can spend without bound in a day. Set
 * AI_DAILY_GLOBAL_LIMIT to tune it. Checked before the per-user reservation; it's a sum rather
 * than an atomic reservation, so a burst can overshoot by a handful, which is fine for a
 * backstop — the per-user limit is the one that has to be exact. */
export const DEFAULT_GLOBAL_DAILY_AI_LIMIT = 1000;

export function globalDailyAiLimit(): number {
  const configured = Number(process.env.AI_DAILY_GLOBAL_LIMIT);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_GLOBAL_DAILY_AI_LIMIT;
}

export type AiUsageCheckResult = { allowed: true } | { allowed: false; error: string };

export const SITE_LIMIT_MESSAGE =
  "AI features are paused for the rest of today — the site-wide daily limit was reached. You can still enter everything manually.";

/** Call this immediately before any Claude API call in a server action, right after
 * verifySession(). The owner is exempt from the per-user cap (but still counted, so the
 * site-wide total is honest). Reserves the slot as a side effect when allowed. */
export async function checkAiUsageAllowed(userId: string): Promise<AiUsageCheckResult> {
  const today = new Date();

  const total = await getAiUsageTotalForDay(today);
  if (total >= globalDailyAiLimit()) {
    // The only alert channel today is the process log; this line is what to grep for.
    console.error(`AI site-wide daily limit reached (${total} actions)`);
    return { allowed: false, error: SITE_LIMIT_MESSAGE };
  }

  const user = await getUserById(userId);
  const perUserLimit =
    user && isOwner(user.email) ? Number.MAX_SAFE_INTEGER : DAILY_AI_ACTION_LIMIT;

  const reserved = await reserveAiUsage(userId, today, perUserLimit);
  if (reserved === null) {
    return {
      allowed: false,
      error: `You've hit today's limit of ${DAILY_AI_ACTION_LIMIT} AI actions (estimating, suggestions, recipes, photo scans, note cleanup all count toward it). It resets at midnight — you can still enter things manually in the meantime.`,
    };
  }
  return { allowed: true };
}

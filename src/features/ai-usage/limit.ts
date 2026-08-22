import { getUserById, isOwner } from "@/features/auth";
import { getAiUsageCountForDay, incrementAiUsage } from "./queries";

// Flat cap across every AI-powered action combined (macro/workout estimation, suggestions,
// recipes, photo scans, note cleanup) — not cost-weighted per feature. Chosen as generous
// headroom for normal personal use while bounding worst-case API cost per user per day. Tune
// this based on real usage/cost data once there's more than one paying account.
export const DAILY_AI_ACTION_LIMIT = 20;

export type AiUsageCheckResult = { allowed: true } | { allowed: false; error: string };

/** Call this immediately before any Claude API call in a server action, right after
 * verifySession(). Always allowed for the site owner. Increments the day's count as a side
 * effect when allowed. */
export async function checkAiUsageAllowed(userId: string): Promise<AiUsageCheckResult> {
  const user = await getUserById(userId);
  if (user && isOwner(user.email)) return { allowed: true };

  const today = new Date();
  const count = await getAiUsageCountForDay(userId, today);
  if (count >= DAILY_AI_ACTION_LIMIT) {
    return {
      allowed: false,
      error: `You've hit today's limit of ${DAILY_AI_ACTION_LIMIT} AI actions (estimating, suggestions, recipes, photo scans, note cleanup all count toward it). It resets at midnight — you can still enter things manually in the meantime.`,
    };
  }

  await incrementAiUsage(userId, today);
  return { allowed: true };
}

import { getUserById, isOwner } from "@/features/auth";
import { dayFromIso, todayIsoIn } from "@/lib/date";
import { AI_UNAVAILABLE_MESSAGE, errorCode } from "./failure";
import { getAiUsageTotalForDay, reserveAiUsage } from "./queries";

/** Longest text any AI action accepts. Real descriptions are a few hundred characters; this
 * bounds the token cost of one action without ever getting in a real person's way. */
export const MAX_AI_INPUT_CHARS = 4000;

export const INPUT_TOO_LONG_MESSAGE = `That's too long to send — keep it under ${MAX_AI_INPUT_CHARS.toLocaleString()} characters.`;

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
export async function checkAiUsageAllowed(
  userId: string,
  options: { input?: string | null } = {},
): Promise<AiUsageCheckResult> {
  if (options.input && options.input.length > MAX_AI_INPUT_CHARS) {
    return { allowed: false, error: INPUT_TOO_LONG_MESSAGE };
  }

  // The day resets at midnight in the member's own time zone, like everything else "today".
  const user = await getUserById(userId);
  const today = dayFromIso(todayIsoIn(user?.timezone));

  // The owner has no per-user cap (null — not a huge number: ai_usage.count is a Postgres
  // integer, and a sentinel that doesn't fit it fails the whole statement). They are still
  // counted, so the site-wide ceiling applies to them too.
  const perUserLimit = user && isOwner(user.email) ? null : DAILY_AI_ACTION_LIMIT;

  // If the counter itself can't be read or reserved, no paid call is made: an action that
  // can't be counted isn't admitted. The caller shows a retryable message instead of crashing.
  let reserved: number | null;
  try {
    const total = await getAiUsageTotalForDay(today);
    if (total >= globalDailyAiLimit()) {
      // The only alert channel today is the process log; this line is what to grep for.
      console.error(`AI site-wide daily limit reached (${total} actions)`);
      return { allowed: false, error: SITE_LIMIT_MESSAGE };
    }
    reserved = await reserveAiUsage(userId, today, perUserLimit);
  } catch (error) {
    console.error(
      "AI admission failed",
      error instanceof Error ? error.name : typeof error,
      errorCode(error),
    );
    return { allowed: false, error: AI_UNAVAILABLE_MESSAGE };
  }
  if (reserved === null) {
    return {
      allowed: false,
      error: `You've hit today's limit of ${DAILY_AI_ACTION_LIMIT} AI actions (estimating, suggestions, recipes, photo scans, note cleanup all count toward it). It resets at midnight — you can still enter things manually in the meantime.`,
    };
  }
  return { allowed: true };
}

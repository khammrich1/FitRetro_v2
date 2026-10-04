/** Pure ordering rules for subscription webhooks, separate from the database so they can be
 * unit-tested exhaustively. Stripe doesn't guarantee delivery order, and a user can have a
 * replacement subscription (cancel, then subscribe again), so two kinds of stale event exist:
 *
 * 1. An older event about the SAME subscription arriving after a newer one (e.g. "updated:
 *    past_due" delayed behind "updated: active"). Decided by the event timestamps.
 * 2. Any event about a DIFFERENT, OLDER subscription than the one on file (e.g. "deleted" for
 *    the previous subscription arriving after "created" for the new one). Decided by the
 *    subscriptions' own creation timestamps — a plain event timestamp isn't enough, since the
 *    old subscription's deletion can genuinely happen after the new one was created.
 *
 * Rows from before these columns existed have nulls, which are treated as "unknown, so apply"
 * to match the previous behaviour until the next event fills them in. */
export type StoredSubscriptionOrdering = {
  stripeSubscriptionId: string;
  stripeSubscriptionCreated: Date | null;
  lastEventCreated: Date | null;
};

export type IncomingSubscriptionEvent = {
  eventCreated: Date;
  stripeSubscriptionId: string;
  stripeSubscriptionCreated: Date;
};

export type OrderingDecision = "apply" | "stale_event" | "stale_subscription";

export function decideSubscriptionEvent(
  stored: StoredSubscriptionOrdering | null,
  incoming: IncomingSubscriptionEvent,
): OrderingDecision {
  if (!stored) return "apply";

  if (stored.stripeSubscriptionId === incoming.stripeSubscriptionId) {
    if (stored.lastEventCreated && incoming.eventCreated < stored.lastEventCreated) {
      return "stale_event";
    }
    return "apply";
  }

  if (
    stored.stripeSubscriptionCreated &&
    incoming.stripeSubscriptionCreated < stored.stripeSubscriptionCreated
  ) {
    return "stale_subscription";
  }
  return "apply";
}

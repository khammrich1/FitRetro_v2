import { describe, expect, it } from "vitest";
import { decideSubscriptionEvent } from "./ordering";

const t = (iso: string) => new Date(iso);
const A = "sub_A";
const B = "sub_B";

describe("decideSubscriptionEvent", () => {
  it("applies anything when nothing is on file", () => {
    expect(
      decideSubscriptionEvent(null, {
        eventCreated: t("2026-10-04T10:00:00Z"),
        stripeSubscriptionId: A,
        stripeSubscriptionCreated: t("2026-10-04T09:00:00Z"),
      }),
    ).toBe("apply");
  });

  it("applies a newer event about the same subscription and rejects an older one", () => {
    const stored = {
      stripeSubscriptionId: A,
      stripeSubscriptionCreated: t("2026-10-01T00:00:00Z"),
      lastEventCreated: t("2026-10-04T10:00:00Z"),
    };
    const base = {
      stripeSubscriptionId: A,
      stripeSubscriptionCreated: stored.stripeSubscriptionCreated,
    };
    expect(
      decideSubscriptionEvent(stored, { ...base, eventCreated: t("2026-10-04T10:05:00Z") }),
    ).toBe("apply");
    expect(
      decideSubscriptionEvent(stored, { ...base, eventCreated: t("2026-10-04T09:55:00Z") }),
    ).toBe("stale_event");
    // Same second: apply (Stripe can emit several events in one second; the later delivery wins).
    expect(
      decideSubscriptionEvent(stored, { ...base, eventCreated: t("2026-10-04T10:00:00Z") }),
    ).toBe("apply");
  });

  it("ignores a late 'deleted' for the OLD subscription once a newer one is on file", () => {
    const stored = {
      stripeSubscriptionId: B,
      stripeSubscriptionCreated: t("2026-10-04T12:00:00Z"),
      lastEventCreated: t("2026-10-04T12:00:01Z"),
    };
    // Old subscription A, created a month ago, deleted AFTER B was created (so the event itself
    // is newer than B's last event) — still stale, because the subscription is older.
    expect(
      decideSubscriptionEvent(stored, {
        eventCreated: t("2026-10-04T12:30:00Z"),
        stripeSubscriptionId: A,
        stripeSubscriptionCreated: t("2026-09-01T00:00:00Z"),
      }),
    ).toBe("stale_subscription");
  });

  it("lets a genuinely newer replacement subscription take over", () => {
    const stored = {
      stripeSubscriptionId: A,
      stripeSubscriptionCreated: t("2026-09-01T00:00:00Z"),
      lastEventCreated: t("2026-10-04T12:30:00Z"),
    };
    expect(
      decideSubscriptionEvent(stored, {
        eventCreated: t("2026-10-04T12:00:00Z"), // earlier than A's last event, doesn't matter
        stripeSubscriptionId: B,
        stripeSubscriptionCreated: t("2026-10-04T12:00:00Z"),
      }),
    ).toBe("apply");
  });

  it("treats rows from before ordering existed as unknown and applies", () => {
    const legacy = {
      stripeSubscriptionId: A,
      stripeSubscriptionCreated: null,
      lastEventCreated: null,
    };
    expect(
      decideSubscriptionEvent(legacy, {
        eventCreated: t("2020-01-01T00:00:00Z"),
        stripeSubscriptionId: B,
        stripeSubscriptionCreated: t("2019-01-01T00:00:00Z"),
      }),
    ).toBe("apply");
  });
});

"use client";

import { useEffect } from "react";
import { setTimeZoneAction } from "@/features/auth/timezone-action";

/** Keeps the account's time zone in step with the device it's used from. Renders nothing; on each
 * page load it compares the browser's zone with what the server has and, when they differ, saves
 * the browser's. That makes "today" on the server mean the member's today — someone in Los
 * Angeles at 9 pm shouldn't be logging into tomorrow because the server is on UTC. */
export function TimeZoneSync({ current }: { current: string | null }) {
  useEffect(() => {
    let zone: string | undefined;
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!zone || zone === current) return;
    void setTimeZoneAction(zone).catch(() => {
      // Best effort: a failed save just means the server keeps using the previous zone.
    });
  }, [current]);
  return null;
}

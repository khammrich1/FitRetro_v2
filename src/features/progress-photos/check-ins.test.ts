import { describe, expect, it } from "vitest";
import { buildPhotoKeys, groupCheckIns } from "./check-ins";

const USER_ID = "7a1c3f8e-0000-4000-8000-000000000001";

describe("buildPhotoKeys", () => {
  it("namespaces keys by user and gives the thumbnail its own key", () => {
    expect(buildPhotoKeys(USER_ID, "abc")).toEqual({
      storageKey: `progress/${USER_ID}/abc.jpg`,
      thumbKey: `progress/${USER_ID}/abc_thumb.jpg`,
    });
  });

  it("uses a fresh random name each time, so a retake never overwrites a file", () => {
    const first = buildPhotoKeys(USER_ID);
    const second = buildPhotoKeys(USER_ID);
    expect(first.storageKey).not.toBe(second.storageKey);
    expect(first.storageKey).toMatch(new RegExp(`^progress/${USER_ID}/[0-9a-f-]{36}\\.jpg$`));
  });
});

describe("groupCheckIns", () => {
  const photo = (id: string, takenOn: string, pose: "front" | "side" | "back") => ({
    id,
    takenOn,
    pose,
  });

  it("groups photos into one check-in per day, newest day first", () => {
    const checkIns = groupCheckIns(
      [
        photo("a", "2026-09-07", "front"),
        photo("b", "2026-09-21", "side"),
        photo("c", "2026-09-21", "front"),
        photo("d", "2026-09-14", "back"),
      ],
      [],
    );
    expect(checkIns.map((c) => c.day)).toEqual(["2026-09-21", "2026-09-14", "2026-09-07"]);
    expect(checkIns[0].photos.front?.id).toBe("c");
    expect(checkIns[0].photos.side?.id).toBe("b");
    expect(checkIns[0].photos.back).toBeUndefined();
  });

  it("attaches the day's measurements, preferring the newest entry per value", () => {
    const [checkIn] = groupCheckIns(
      [photo("a", "2026-09-21", "front")],
      [
        // Newest first: an evening entry with only weight, then a morning one with everything.
        { day: "2026-09-21", weightKg: 80, waistCm: null, bodyFatPercent: null },
        { day: "2026-09-21", weightKg: 81, waistCm: 86, bodyFatPercent: 18 },
      ],
    );
    expect(checkIn.measurement).toEqual({ weightKg: 80, waistCm: 86, bodyFatPercent: 18 });
  });

  it("ignores measurement-only days and leaves photo-only days without measurements", () => {
    const checkIns = groupCheckIns(
      [photo("a", "2026-09-21", "front")],
      [{ day: "2026-09-20", weightKg: 80, waistCm: null, bodyFatPercent: null }],
    );
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0].measurement).toBeNull();
  });
});

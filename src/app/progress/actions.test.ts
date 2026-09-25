// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import sharp from "sharp";

const mocks = vi.hoisted(() => {
  class RedirectError extends Error {
    constructor(public readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  const jar = new Map<string, string>();
  return {
    RedirectError,
    jar,
    storageConfigured: { value: true },
    putObject: vi.fn(),
    deleteObjects: vi.fn(),
    saveProgressPhoto: vi.fn(),
    deleteProgressPhoto: vi.fn(),
    deleteProgressPhotosForDay: vi.fn(),
    upsertMeasurementForDay: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.jar.has(name) ? { name, value: mocks.jar.get(name)! } : undefined,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new mocks.RedirectError(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
// Storage and DB writes are faked; the real session check and real image processing stay in play.
vi.mock("@/lib/object-storage", () => ({
  isObjectStorageConfigured: () => mocks.storageConfigured.value,
  putObject: mocks.putObject,
  deleteObjects: mocks.deleteObjects,
}));
vi.mock("@/features/progress-photos", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/progress-photos")>()),
  saveProgressPhoto: mocks.saveProgressPhoto,
  deleteProgressPhoto: mocks.deleteProgressPhoto,
  deleteProgressPhotosForDay: mocks.deleteProgressPhotosForDay,
}));
vi.mock("@/features/measurements", () => ({
  upsertMeasurementForDay: mocks.upsertMeasurementForDay,
}));

const { saveCheckInAction, deleteProgressPhotoAction, deleteCheckInAction } =
  await import("./actions");

const SESSION_SECRET = "test-session-secret-not-a-real-credential";
const USER_ID = "7a1c3f8e-0000-4000-8000-000000000001";
const PHOTO_ID = "0f0e0d0c-0000-4000-8000-00000000abcd";

async function signIn() {
  const token = await new SignJWT({ userId: USER_ID })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(SESSION_SECRET));
  mocks.jar.set("session", token);
}

async function jpegFile(name = "photo.jpg") {
  const bytes = await sharp({ create: { width: 90, height: 120, channels: 3, background: "#a55" } })
    .jpeg()
    .toBuffer();
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}

function form(fields: Record<string, string | File>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof mocks.RedirectError) return error.url;
    throw error;
  }
  throw new Error("Expected a redirect.");
}

beforeEach(async () => {
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  mocks.jar.clear();
  mocks.storageConfigured.value = true;
  for (const fn of [
    mocks.putObject,
    mocks.deleteObjects,
    mocks.saveProgressPhoto,
    mocks.deleteProgressPhoto,
    mocks.deleteProgressPhotosForDay,
    mocks.upsertMeasurementForDay,
  ]) {
    fn.mockReset();
  }
  mocks.saveProgressPhoto.mockResolvedValue({ replaced: null });
  await signIn();
});

describe("saveCheckInAction", () => {
  it("sends signed-out visitors to login without touching storage", async () => {
    mocks.jar.clear();
    const target = await redirectTarget(() =>
      saveCheckInAction(undefined, form({ takenOn: "2026-09-21", front: new File([], "x") })),
    );
    expect(target).toBe("/login");
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("refuses uploads when storage isn't configured", async () => {
    mocks.storageConfigured.value = false;
    const result = await saveCheckInAction(
      undefined,
      form({ takenOn: "2026-09-21", front: await jpegFile() }),
    );
    expect(result?.error).toMatch(/storage isn't set up/);
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("requires at least one photo", async () => {
    const result = await saveCheckInAction(
      undefined,
      form({ takenOn: "2026-09-21", weightLbs: "180" }),
    );
    expect(result?.error).toBe("Add at least one photo.");
    expect(mocks.upsertMeasurementForDay).not.toHaveBeenCalled();
  });

  it("rejects future and malformed dates", async () => {
    const far = await saveCheckInAction(
      undefined,
      form({ takenOn: "2999-01-01", front: await jpegFile() }),
    );
    expect(far?.errors?.takenOn).toEqual(["That date is in the future."]);
    const bad = await saveCheckInAction(
      undefined,
      form({ takenOn: "yesterday", front: await jpegFile() }),
    );
    expect(bad?.errors?.takenOn).toBeDefined();
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("rejects out-of-range measurements", async () => {
    const result = await saveCheckInAction(
      undefined,
      form({ takenOn: "2026-09-21", front: await jpegFile(), bodyFatPercent: "150" }),
    );
    expect(result?.errors?.bodyFatPercent).toEqual(["Body fat looks too high."]);
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("rejects an unreadable file before storing anything, even alongside a good photo", async () => {
    const result = await saveCheckInAction(
      undefined,
      form({
        takenOn: "2026-09-21",
        front: await jpegFile(),
        side: new File(["not an image"], "notes.txt", { type: "text/plain" }),
      }),
    );
    expect(result?.error).toMatch(/isn't a photo we can read/);
    expect(mocks.putObject).not.toHaveBeenCalled();
    expect(mocks.saveProgressPhoto).not.toHaveBeenCalled();
  });

  it("rejects an oversized photo", async () => {
    const huge = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "huge.jpg", {
      type: "image/jpeg",
    });
    const result = await saveCheckInAction(undefined, form({ takenOn: "2026-09-21", front: huge }));
    expect(result?.error).toMatch(/too large/);
    expect(mocks.putObject).not.toHaveBeenCalled();
  });

  it("stores each photo privately under the user's prefix and records it for the right day and pose", async () => {
    const result = await saveCheckInAction(
      undefined,
      form({
        takenOn: "2026-09-21",
        front: await jpegFile(),
        back: await jpegFile(),
        weightLbs: "180",
        waistIn: "34",
        bodyFatPercent: "",
      }),
    );

    expect(result).toEqual({ ok: "Saved 2 photos." });
    expect(mocks.putObject).toHaveBeenCalledTimes(4);
    for (const [key, body, contentType] of mocks.putObject.mock.calls) {
      expect(key).toMatch(new RegExp(`^progress/${USER_ID}/[0-9a-f-]{36}(_thumb)?\\.jpg$`));
      expect(contentType).toBe("image/jpeg");
      // What's stored is the re-encoded image, not the raw upload.
      expect((await sharp(body).metadata()).exif).toBeUndefined();
    }

    const rows = mocks.saveProgressPhoto.mock.calls.map(([row]) => row);
    expect(rows.map((row) => row.pose)).toEqual(["front", "back"]);
    for (const row of rows) {
      expect(row).toMatchObject({ userId: USER_ID, takenOn: "2026-09-21", width: 90, height: 120 });
      expect(mocks.putObject.mock.calls.map(([key]) => key)).toEqual(
        expect.arrayContaining([row.storageKey, row.thumbKey]),
      );
    }

    expect(mocks.upsertMeasurementForDay).toHaveBeenCalledWith(USER_ID, "2026-09-21", {
      weightKg: expect.closeTo(81.647, 3),
      waistCm: expect.closeTo(86.36, 2),
      bodyFatPercent: undefined,
    });
    expect(mocks.deleteObjects).not.toHaveBeenCalled();
  });

  it("deletes the replaced files when a pose is retaken", async () => {
    mocks.saveProgressPhoto.mockResolvedValue({
      replaced: { storageKey: "progress/u/old.jpg", thumbKey: "progress/u/old_thumb.jpg" },
    });
    const result = await saveCheckInAction(
      undefined,
      form({ takenOn: "2026-09-21", side: await jpegFile() }),
    );
    expect(result?.ok).toBe("Saved 1 photo.");
    expect(mocks.deleteObjects).toHaveBeenCalledWith([
      "progress/u/old.jpg",
      "progress/u/old_thumb.jpg",
    ]);
  });

  it("reports a storage outage without crashing", async () => {
    mocks.putObject.mockRejectedValue(
      Object.assign(new Error("boom"), { name: "ServiceUnavailable" }),
    );
    const result = await saveCheckInAction(
      undefined,
      form({ takenOn: "2026-09-21", front: await jpegFile() }),
    );
    expect(result?.error).toMatch(/Couldn't save your photos/);
    expect(mocks.saveProgressPhoto).not.toHaveBeenCalled();
  });
});

describe("delete actions", () => {
  it("only deletes the photo scoped to the signed-in user, then its files", async () => {
    mocks.deleteProgressPhoto.mockResolvedValue({ storageKey: "a.jpg", thumbKey: "a_thumb.jpg" });
    await deleteProgressPhotoAction(PHOTO_ID);
    expect(mocks.deleteProgressPhoto).toHaveBeenCalledWith(PHOTO_ID, USER_ID);
    expect(mocks.deleteObjects).toHaveBeenCalledWith(["a.jpg", "a_thumb.jpg"]);
  });

  it("does nothing to files when the photo isn't the user's", async () => {
    mocks.deleteProgressPhoto.mockResolvedValue(null);
    await deleteProgressPhotoAction(PHOTO_ID);
    expect(mocks.deleteObjects).not.toHaveBeenCalled();
  });

  it("ignores malformed ids and days", async () => {
    await deleteProgressPhotoAction("../../etc");
    await deleteCheckInAction("not-a-day");
    expect(mocks.deleteProgressPhoto).not.toHaveBeenCalled();
    expect(mocks.deleteProgressPhotosForDay).not.toHaveBeenCalled();
  });

  it("deletes a whole check-in day for the signed-in user", async () => {
    mocks.deleteProgressPhotosForDay.mockResolvedValue([
      { storageKey: "f.jpg", thumbKey: "f_thumb.jpg" },
      { storageKey: "s.jpg", thumbKey: "s_thumb.jpg" },
    ]);
    await deleteCheckInAction("2026-09-21");
    expect(mocks.deleteProgressPhotosForDay).toHaveBeenCalledWith(USER_ID, "2026-09-21");
    expect(mocks.deleteObjects).toHaveBeenCalledWith([
      "f.jpg",
      "f_thumb.jpg",
      "s.jpg",
      "s_thumb.jpg",
    ]);
  });

  it("requires sign-in", async () => {
    mocks.jar.clear();
    expect(await redirectTarget(() => deleteProgressPhotoAction(PHOTO_ID))).toBe("/login");
    expect(await redirectTarget(() => deleteCheckInAction("2026-09-21"))).toBe("/login");
    expect(mocks.deleteProgressPhoto).not.toHaveBeenCalled();
  });
});

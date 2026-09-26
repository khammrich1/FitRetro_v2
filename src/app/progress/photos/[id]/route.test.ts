// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  getProgressPhotoForUser: vi.fn(),
  getObjectStream: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.jar.has(name) ? { name, value: mocks.jar.get(name)! } : undefined,
  }),
}));
vi.mock("@/features/progress-photos", () => ({
  getProgressPhotoForUser: mocks.getProgressPhotoForUser,
}));
vi.mock("@/lib/object-storage", () => ({ getObjectStream: mocks.getObjectStream }));

const { GET } = await import("./route");

const SESSION_SECRET = "test-session-secret-not-a-real-credential";
const USER_ID = "7a1c3f8e-0000-4000-8000-000000000001";
const PHOTO_ID = "0f0e0d0c-0000-4000-8000-00000000abcd";
const PHOTO = {
  id: PHOTO_ID,
  userId: USER_ID,
  storageKey: `progress/${USER_ID}/full.jpg`,
  thumbKey: `progress/${USER_ID}/full_thumb.jpg`,
};

async function signIn(userId = USER_ID) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(SESSION_SECRET));
  mocks.jar.set("session", token);
}

function get(id: string, query = "") {
  return GET(new NextRequest(`http://localhost:3000/progress/photos/${id}${query}`), {
    params: Promise.resolve({ id }),
  });
}

function expectPrivate(response: Response) {
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
}

beforeEach(() => {
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  mocks.jar.clear();
  mocks.getProgressPhotoForUser.mockReset();
  mocks.getObjectStream.mockReset();
  mocks.getObjectStream.mockImplementation(async (key: string) => ({
    body: new Blob([`bytes of ${key}`]).stream(),
    contentType: "image/jpeg",
  }));
});

describe("GET /progress/photos/[id]", () => {
  it("serves the owner's full-size photo, uncacheable", async () => {
    await signIn();
    mocks.getProgressPhotoForUser.mockResolvedValue(PHOTO);
    const response = await get(PHOTO_ID);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expectPrivate(response);
    expect(await response.text()).toBe(`bytes of ${PHOTO.storageKey}`);
    expect(mocks.getProgressPhotoForUser).toHaveBeenCalledWith(PHOTO_ID, USER_ID);
  });

  it("serves the thumbnail with ?size=thumb", async () => {
    await signIn();
    mocks.getProgressPhotoForUser.mockResolvedValue(PHOTO);
    const response = await get(PHOTO_ID, "?size=thumb&v=123");
    expect(await response.text()).toBe(`bytes of ${PHOTO.thumbKey}`);
  });

  it("404s when signed out, without looking anything up", async () => {
    const response = await get(PHOTO_ID);
    expect(response.status).toBe(404);
    expectPrivate(response);
    expect(mocks.getProgressPhotoForUser).not.toHaveBeenCalled();
  });

  it("404s for someone else's photo — the lookup is scoped to the signed-in user", async () => {
    const otherUser = "7a1c3f8e-0000-4000-8000-000000000002";
    await signIn(otherUser);
    mocks.getProgressPhotoForUser.mockResolvedValue(null);
    const response = await get(PHOTO_ID);
    expect(response.status).toBe(404);
    expect(mocks.getProgressPhotoForUser).toHaveBeenCalledWith(PHOTO_ID, otherUser);
    expect(mocks.getObjectStream).not.toHaveBeenCalled();
  });

  it("404s for a forged session cookie", async () => {
    const token = await new SignJWT({ userId: USER_ID })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("some-other-secret"));
    mocks.jar.set("session", token);
    expect((await get(PHOTO_ID)).status).toBe(404);
    expect(mocks.getProgressPhotoForUser).not.toHaveBeenCalled();
  });

  it("404s for a malformed id without querying", async () => {
    await signIn();
    expect((await get("not-a-uuid")).status).toBe(404);
    expect(mocks.getProgressPhotoForUser).not.toHaveBeenCalled();
  });

  it("404s when the file is missing and 503s when storage is down", async () => {
    await signIn();
    mocks.getProgressPhotoForUser.mockResolvedValue(PHOTO);
    mocks.getObjectStream.mockResolvedValueOnce(null);
    expect((await get(PHOTO_ID)).status).toBe(404);
    mocks.getObjectStream.mockRejectedValueOnce(new Error("down"));
    const response = await get(PHOTO_ID);
    expect(response.status).toBe(503);
    expectPrivate(response);
  });
});

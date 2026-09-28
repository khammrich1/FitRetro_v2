import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getProgressPhotoForUser } from "@/features/progress-photos";
import { getObjectStream } from "@/lib/object-storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Headers on every response, including the 404s: never cached anywhere (these are private
 * photos, and a shared/family device shouldn't keep them after logout), never indexed, and never
 * sniffed as anything other than an image. */
const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

function notFound() {
  // Same answer for "doesn't exist" and "isn't yours", so ids can't be probed.
  return new Response("Not found", { status: 404, headers: PRIVATE_HEADERS });
}

/** Streams one of the signed-in user's progress photos out of private storage. The only way a
 * stored photo is ever read — there are no public or pre-signed URLs. `?size=thumb` serves the
 * thumbnail. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.userId) return notFound();

  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const photo = await getProgressPhotoForUser(id, session.userId);
  if (!photo) return notFound();

  const key =
    request.nextUrl.searchParams.get("size") === "thumb" ? photo.thumbKey : photo.storageKey;
  let object;
  try {
    object = await getObjectStream(key);
  } catch (error) {
    console.error("Progress photo read failed", error instanceof Error ? error.name : "");
    return new Response("Photo unavailable", { status: 503, headers: PRIVATE_HEADERS });
  }
  if (!object) return notFound();

  return new Response(object.body, {
    headers: { ...PRIVATE_HEADERS, "Content-Type": "image/jpeg" },
  });
}

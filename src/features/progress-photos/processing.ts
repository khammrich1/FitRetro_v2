import "server-only";
import sharp from "sharp";

/** Longest edge of the stored full-size photo — plenty for comparing on a phone or laptop. */
export const FULL_MAX_EDGE = 1600;
/** Longest edge of the timeline thumbnail. */
export const THUMB_MAX_EDGE = 480;
/** Refuse absurd inputs before decoding them (a phone photo is ~12–50 megapixels). */
const MAX_INPUT_PIXELS = 80_000_000;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class UnsupportedPhotoError extends Error {
  constructor(message = "That file isn't a photo we can read — use a JPEG, PNG or WebP image.") {
    super(message);
    this.name = "UnsupportedPhotoError";
  }
}

export type ProcessedPhoto = {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
};

/** Re-encodes an uploaded photo into what gets stored: turned upright per its EXIF orientation,
 * shrunk to FULL_MAX_EDGE (plus a THUMB_MAX_EDGE thumbnail), and re-encoded as JPEG with every
 * piece of metadata dropped — EXIF, GPS location, camera/device details. Only pixels survive, so
 * nothing about where or on what the photo was taken is ever stored. */
export async function processProgressPhoto(input: Buffer): Promise<ProcessedPhoto> {
  let format: string | undefined;
  try {
    ({ format } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata());
  } catch {
    throw new UnsupportedPhotoError();
  }
  if (!format || !ACCEPTED_FORMATS.has(format)) {
    throw new UnsupportedPhotoError();
  }

  // .rotate() with no angle applies the EXIF orientation, so the pixels themselves end up
  // upright once the orientation tag is stripped along with everything else.
  const upright = () =>
    sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();

  try {
    const full = await upright()
      .resize({
        width: FULL_MAX_EDGE,
        height: FULL_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    const thumb = await upright()
      .resize({
        width: THUMB_MAX_EDGE,
        height: THUMB_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

    return { full: full.data, thumb, width: full.info.width, height: full.info.height };
  } catch {
    throw new UnsupportedPhotoError("That photo couldn't be processed — try taking it again.");
  }
}

// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

const { processProgressPhoto, UnsupportedPhotoError, FULL_MAX_EDGE, THUMB_MAX_EDGE } =
  await import("./processing");

/** A JPEG carrying the kind of metadata a phone embeds: camera make/model, owner, GPS position
 * and an orientation tag (6 = "rotate 90° clockwise to display"). */
async function phoneJpeg(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 80 } },
  })
    .jpeg()
    .withExif({
      IFD0: { Make: "SecretPhoneMaker", Model: "SecretPhone 99", Copyright: "Jane Q Owner" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "40/1 44/1 5436/100",
        GPSLongitudeRef: "W",
        GPSLongitude: "73/1 59/1 1101/100",
      },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

describe("processProgressPhoto", () => {
  it("strips every piece of metadata — EXIF, GPS, camera, orientation", async () => {
    const input = await phoneJpeg(400, 200);
    const inputMeta = await sharp(input).metadata();
    // Sanity check that the fixture really carries what we're stripping.
    expect(inputMeta.exif).toBeDefined();
    expect(inputMeta.orientation).toBe(6);
    expect(input.includes("SecretPhoneMaker")).toBe(true);

    const { full, thumb } = await processProgressPhoto(input);

    for (const output of [full, thumb]) {
      const meta = await sharp(output).metadata();
      expect(meta.format).toBe("jpeg");
      expect(meta.exif).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.iptc).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      expect(output.includes("SecretPhoneMaker")).toBe(false);
      expect(output.includes("Jane Q Owner")).toBe(false);
      expect(output.includes("GPS")).toBe(false);
    }
  });

  it("bakes the orientation into the pixels so the photo stays upright", async () => {
    // Stored 400 wide x 200 tall, but orientation 6 means it's displayed 200 x 400 (portrait).
    const { full, width, height } = await processProgressPhoto(await phoneJpeg(400, 200));
    expect({ width, height }).toEqual({ width: 200, height: 400 });
    const meta = await sharp(full).metadata();
    expect({ width: meta.width, height: meta.height }).toEqual({ width: 200, height: 400 });
  });

  it("shrinks large photos to the full-size and thumbnail limits, keeping the aspect ratio", async () => {
    const input = await sharp({
      create: { width: 3000, height: 4000, channels: 3, background: "#336699" },
    })
      .jpeg()
      .toBuffer();

    const { full, thumb, width, height } = await processProgressPhoto(input);

    expect(height).toBe(FULL_MAX_EDGE);
    expect(width).toBe(1200);
    const thumbMeta = await sharp(thumb).metadata();
    expect(thumbMeta.height).toBe(THUMB_MAX_EDGE);
    expect(thumbMeta.width).toBe(360);
    expect(full.length).toBeGreaterThan(thumb.length);
  });

  it("never enlarges a small photo", async () => {
    const input = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#000" },
    })
      .png()
      .toBuffer();
    const { width, height } = await processProgressPhoto(input);
    expect({ width, height }).toEqual({ width: 300, height: 200 });
  });

  it("accepts PNG and WebP, re-encoding them as JPEG", async () => {
    for (const encode of [(s: sharp.Sharp) => s.png(), (s: sharp.Sharp) => s.webp()]) {
      const input = await encode(
        sharp({ create: { width: 50, height: 60, channels: 3, background: "#fff" } }),
      ).toBuffer();
      const { full } = await processProgressPhoto(input);
      expect((await sharp(full).metadata()).format).toBe("jpeg");
    }
  });

  it("rejects files that aren't a supported photo", async () => {
    await expect(processProgressPhoto(Buffer.from("definitely not an image"))).rejects.toThrow(
      UnsupportedPhotoError,
    );
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } })
      .gif()
      .toBuffer();
    await expect(processProgressPhoto(gif)).rejects.toThrow(UnsupportedPhotoError);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(processProgressPhoto(svg)).rejects.toThrow(UnsupportedPhotoError);
  });

  it("rejects a truncated (corrupt) JPEG", async () => {
    const input = await phoneJpeg(400, 300);
    await expect(processProgressPhoto(input.subarray(0, input.length / 2))).rejects.toThrow(
      UnsupportedPhotoError,
    );
  });
});

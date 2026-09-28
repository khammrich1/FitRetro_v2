/** Browser-only: re-draws a picked photo onto a canvas at most `maxEdge` px on its longest side and
 * re-encodes it as JPEG. Phone photos are often 3–12MB (over the upload limit for three at once);
 * this brings each to well under 1MB, and because only pixels are redrawn, EXIF/GPS metadata never
 * leaves the device. Falls back to the original file if the browser can't decode it — the server
 * validates and re-processes everything regardless. */
export async function shrinkImageForUpload(file: File, maxEdge = 2000): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

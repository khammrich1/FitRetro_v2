import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

/** Private object storage for user uploads (progress photos). Any S3-compatible service works;
 * production uses a DigitalOcean Spaces bucket with no public access — every read goes through
 * an owner-checked route, never a public or pre-signed URL. Credentials are server-only. */
type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function readConfig(): StorageConfig | null {
  const endpoint = process.env.SPACES_ENDPOINT?.trim();
  const bucket = process.env.SPACES_BUCKET?.trim();
  const accessKeyId = process.env.SPACES_KEY?.trim();
  const secretAccessKey = process.env.SPACES_SECRET?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  // Spaces ignores the SigV4 region (the endpoint picks the datacenter), but the SDK needs one.
  const region = process.env.SPACES_REGION?.trim() || "us-east-1";
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}

export function isObjectStorageConfigured(): boolean {
  return readConfig() !== null;
}

export class ObjectStorageNotConfiguredError extends Error {
  constructor() {
    super("Photo storage isn't configured (SPACES_* in .env).");
    this.name = "ObjectStorageNotConfiguredError";
  }
}

let cached: { client: S3Client; bucket: string } | null = null;

function getStorage() {
  if (cached) return cached;
  const config = readConfig();
  if (!config) throw new ObjectStorageNotConfiguredError();
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    // Path-style ("endpoint/bucket/key") works on Spaces and on any local S3 stand-in.
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    maxAttempts: 3,
    // Newer SDKs add CRC checksums to every request by default, which S3-compatible services
    // (Spaces included) don't all accept. Only send/verify them where the API requires it.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  cached = { client, bucket: config.bucket };
  return cached;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client, bucket } = getStorage();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Explicitly private, even if the bucket's default ever changes.
      ACL: "private",
    }),
  );
}

/** The object's bytes as a web stream, or null if it doesn't exist. */
export async function getObjectStream(
  key: string,
): Promise<{ body: ReadableStream; contentType: string | undefined } | null> {
  const { client, bucket } = getStorage();
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return null;
    return { body: result.Body.transformToWebStream(), contentType: result.ContentType };
  } catch (error) {
    if (error instanceof Error && (error.name === "NoSuchKey" || error.name === "NotFound")) {
      return null;
    }
    throw error;
  }
}

/** Deletes each key with its own request. A check-in has at most a handful of files, and the
 * single-object delete is the one call every S3-compatible service supports identically (the
 * batch DeleteObjects call needs a request checksum some of them reject). Deleting a key that's
 * already gone succeeds. */
export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const { client, bucket } = getStorage();
  await Promise.all(
    keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key }))),
  );
}

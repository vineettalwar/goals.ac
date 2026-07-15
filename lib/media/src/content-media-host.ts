import { optimizeImageBuffer, slugifyForFilename } from "./optimize";
import { decodeRasterFeaturedDataUri, isRasterFeaturedDataUri } from "./raster-data-uri";
import { getContentMediaR2Binding } from "./r2-binding";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type HostContentMediaOptions = {
  /** Path segment after `content/` — project id or "anon". */
  scope?: string;
  /** Filename stem before uuid (e.g. keyword). */
  filenameBase?: string;
};

function publicBaseUrl(): string | null {
  const raw = process.env.CONTENT_MEDIA_PUBLIC_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function isContentMediaConfigured(): boolean {
  if (!publicBaseUrl()) return false;
  if (getContentMediaR2Binding()) return true;
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      (process.env.CONTENT_MEDIA_R2_BUCKET?.trim() || process.env.R2_BUCKET_NAME?.trim()),
  );
}

function objectKey(scope: string, filename: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeScope = slugifyForFilename(scope) || "anon";
  return `content/${safeScope}/${yyyy}/${mm}/${filename}`;
}

async function putViaBinding(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<boolean> {
  const bucket = getContentMediaR2Binding();
  if (!bucket) return false;
  await bucket.put(key, body, { httpMetadata: { contentType } });
  return true;
}

async function putViaS3Api(key: string, body: Buffer, contentType: string): Promise<boolean> {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket =
    process.env.CONTENT_MEDIA_R2_BUCKET?.trim() || process.env.R2_BUCKET_NAME?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return false;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return true;
}

/**
 * Upload a raster featured data URI to the public content-media R2 host.
 * Returns the public HTTPS URL, or null when not configured / not a data URI / upload fails.
 */
export async function hostRasterFeaturedDataUri(
  featuredImageUrl: string | null | undefined,
  options?: HostContentMediaOptions,
): Promise<string | null> {
  const raw = featuredImageUrl?.trim();
  if (!raw || !isRasterFeaturedDataUri(raw)) return null;
  if (!isContentMediaConfigured()) return null;

  const decoded = decodeRasterFeaturedDataUri(raw);
  if (!decoded) return null;

  const base = publicBaseUrl();
  if (!base) return null;

  let body = decoded.buffer;
  let contentType: string = decoded.mimeHint;
  let filename = `${slugifyForFilename(options?.filenameBase ?? "featured")}-${randomUUID().slice(0, 8)}`;

  try {
    const optimized = await optimizeImageBuffer(decoded.buffer, options?.filenameBase ?? "featured", {
      maxWidth: 1920,
      quality: 85,
    });
    body = optimized.buffer;
    contentType = optimized.mimeType;
    filename = optimized.filename.replace(/\.webp$/i, "") + `-${randomUUID().slice(0, 8)}.webp`;
  } catch {
    // Workers sharp stub — keep original PNG/JPEG bytes.
    const ext = decoded.mimeHint === "image/png" ? "png" : "jpg";
    filename = `${filename}.${ext}`;
  }

  const key = objectKey(options?.scope ?? "anon", filename);

  try {
    const viaBinding = await putViaBinding(key, body, contentType);
    if (!viaBinding) {
      const viaS3 = await putViaS3Api(key, body, contentType);
      if (!viaS3) return null;
    }
  } catch {
    return null;
  }

  return `${base}/${key}`;
}

/**
 * If `url` is a hosted HTTPS URL, return it. If raster data URI and host is
 * configured, upload and return HTTPS. Otherwise return undefined (callers keep original).
 */
export async function resolveHostedFeaturedImageUrl(
  url: string | null | undefined,
  options?: HostContentMediaOptions,
): Promise<string | undefined> {
  const raw = url?.trim();
  if (!raw) return undefined;
  if (/^https:\/\//i.test(raw)) return raw;
  const hosted = await hostRasterFeaturedDataUri(raw, options);
  return hosted ?? undefined;
}

export function isContentMediaHostConfigured(): boolean {
  return isContentMediaConfigured();
}

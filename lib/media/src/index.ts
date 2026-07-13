import { assertAllowedStockCdnUrl } from "@workspace/stock-images";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import sharp from "sharp";

export type OptimizeImageOptions = {
  maxWidth?: number;
  quality?: number;
};

export type OptimizedImage = {
  buffer: Buffer;
  mimeType: "image/webp";
  filename: string;
  width: number;
  height: number;
};

export function slugifyForFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
}

export async function downloadImageBuffer(url: string): Promise<Buffer> {
  if (url.includes("images.unsplash.com") || url.includes("images.pexels.com") || url.includes("plus.unsplash.com")) {
    assertAllowedStockCdnUrl(url);
  } else {
    await assertPublicUrl(url);
  }

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Failed to download image: HTTP ${res.status}`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`URL did not return an image (content-type: ${contentType || "unknown"})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function optimizeImageBuffer(
  input: Buffer,
  filenameBase: string,
  options?: OptimizeImageOptions,
): Promise<OptimizedImage> {
  const maxWidth = options?.maxWidth ?? 1920;
  const quality = options?.quality ?? 85;

  const pipeline = sharp(input).rotate().resize({
    width: maxWidth,
    withoutEnlargement: true,
  });

  const { data, info } = await pipeline.webp({ quality }).toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    mimeType: "image/webp",
    filename: `${slugifyForFilename(filenameBase)}.webp`,
    width: info.width,
    height: info.height,
  };
}

export async function downloadAndOptimizeImage(
  url: string,
  filenameBase: string,
  options?: OptimizeImageOptions,
): Promise<OptimizedImage> {
  const raw = await downloadImageBuffer(url);
  return optimizeImageBuffer(raw, filenameBase, options);
}

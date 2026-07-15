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
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
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

export type SvgToPngOptions = {
  /** Output width in px (height scales). Default 960. */
  width?: number;
};

/**
 * Rasterize SVG markup to a PNG data URI (Node + native sharp only).
 * Cloudflare Workers alias `sharp` to a stub that rejects — callers must catch.
 */
export async function svgMarkupToPngDataUri(
  svg: string,
  options?: SvgToPngOptions,
): Promise<string> {
  const width = options?.width ?? 960;
  const input = Buffer.from(svg, "utf8");
  const { data } = await sharp(input)
    .resize({ width, withoutEnlargement: false })
    .png()
    .toBuffer({ resolveWithObject: true });
  return `data:image/png;base64,${data.toString("base64")}`;
}

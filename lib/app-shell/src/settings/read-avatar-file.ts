/** Max raw file size before client resize. */
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const AVATAR_EDGE = 256;
const JPEG_QUALITY = 0.85;

/**
 * Read a local image file and return a small JPEG data URL for profile avatars.
 * Resizes to fit inside AVATAR_EDGE×AVATAR_EDGE (browser canvas).
 */
export async function readAvatarFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file (JPEG, PNG, or WebP).");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Image must be under 8MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = fitContain(img.naturalWidth, img.naturalHeight, AVATAR_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fitContain(srcW: number, srcH: number, maxEdge: number): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) return { width: maxEdge, height: maxEdge };
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

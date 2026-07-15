/**
 * Workers cannot load native sharp binaries. Alias replaces `sharp` in this bundle.
 * Image optimization for CMS publish should use pass-through or Cloudflare Images.
 */
class SharpStub {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_input?: unknown) {}

  rotate() {
    return this;
  }

  resize(_opts?: unknown) {
    return this;
  }

  webp(_opts?: unknown) {
    return this;
  }

  png(_opts?: unknown) {
    return this;
  }

  toBuffer(): Promise<Buffer> {
    return Promise.reject(
      new Error(
        "sharp is not available in goals-ac-jobs Worker; use Cloudflare Images or publish without local optimization",
      ),
    );
  }
}

export default function sharp(input?: unknown) {
  return new SharpStub(input);
}

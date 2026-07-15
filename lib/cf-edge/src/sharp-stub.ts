/**
 * Workers cannot load native sharp binaries. Wrangler alias replaces `sharp` in edge bundles.
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
        "sharp is not available in Cloudflare Workers; use Cloudflare Images or publish without local optimization",
      ),
    );
  }
}

export default function sharp(input?: unknown) {
  return new SharpStub(input);
}

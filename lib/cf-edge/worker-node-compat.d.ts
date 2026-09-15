/**
 * nodejs_compat: Node Buffer encodings exist at runtime.
 * @cloudflare/workers-types types crypto.randomBytes as Uint8Array,
 * whose toString() takes no encoding argument.
 */
interface Uint8Array {
  toString(encoding?: string, start?: number, end?: number): string;
}

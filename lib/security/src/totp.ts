import crypto from "crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const normalized = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) continue;
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", secret).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function generateTotpSecret(byteLength = 20): string {
  const random = crypto.randomBytes(byteLength);
  let output = "";
  let bits = 0;
  let value = 0;
  for (const byte of random) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function buildTotpAuthUri(secret: string, email: string, issuer = "goals.ac"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const query = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${query.toString()}`;
}

export function verifyTotpCode(secret: string, token: string, window = 1): boolean {
  const normalized = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const key = base32Decode(secret);
  const timestep = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset += 1) {
    if (hotp(key, timestep + offset) === normalized) {
      return true;
    }
  }
  return false;
}

export function currentTotpCode(secret: string): string {
  const key = base32Decode(secret);
  const timestep = Math.floor(Date.now() / 1000 / 30);
  return hotp(key, timestep);
}

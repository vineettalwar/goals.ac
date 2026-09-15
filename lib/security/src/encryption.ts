import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret = process.env["GEMINI_KEY_ENCRYPTION_SECRET"];
  if (!secret) {
    throw new Error("GEMINI_KEY_ENCRYPTION_SECRET environment variable is not set");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");
  const [ivHex, authTagHex, dataHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

const CIPHERTEXT_RE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

/** Decrypt AES-GCM ciphertext. Legacy plaintext (no ciphertext shape) is returned as-is. */
export function decryptStoredSecret(stored: string | null | undefined): string | null {
  const value = stored?.trim();
  if (!value) return null;
  try {
    return decryptSecret(value);
  } catch {
    if (CIPHERTEXT_RE.test(value)) return null;
    return value;
  }
}

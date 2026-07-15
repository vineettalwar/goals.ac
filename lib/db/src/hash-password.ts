/**
 * Hash (or verify) a password using bcrypt — for seeds, D1 updates, and debugging.
 *
 * Usage:
 *   pnpm --filter @workspace/db run hash-password -- GoldSuite2026!
 *   pnpm run cf:hash-password -- GoldSuite2026!
 *   pnpm --filter @workspace/db run hash-password -- --verify GoldSuite2026! '$2b$10$...'
 */
import bcrypt from "bcryptjs";

const args = process.argv.slice(2);
const verify = args[0] === "--verify";
const password = verify ? args[1] : args[0];
const hash = verify ? args[2] : undefined;

if (!password) {
  console.error("Usage: hash-password [--verify] <password> [bcrypt-hash]");
  process.exit(1);
}

if (verify) {
  if (!hash) {
    console.error("Usage: hash-password --verify <password> <bcrypt-hash>");
    process.exit(1);
  }
  const ok = await bcrypt.compare(password, hash);
  console.log(ok ? "match" : "no match");
  process.exit(ok ? 0 : 1);
}

const passwordHash = await bcrypt.hash(password, 10);
console.log(passwordHash);

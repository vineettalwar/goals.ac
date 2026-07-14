/**
 * Ensures wrangler CLI commands target the pinned Cloudflare account.
 * See scripts/cloudflare-account.json (Contact@vineet.de).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const accountFile = path.resolve(__dirname, "../../../scripts/cloudflare-account.json");

type CfAccount = { account_id: string; account_name: string };

export function loadCfAccount(): CfAccount {
  const raw = fs.readFileSync(accountFile, "utf8");
  return JSON.parse(raw) as CfAccount;
}

export function assertWranglerAccount(wranglerConfigPath: string): string {
  const expected = loadCfAccount();
  const content = fs.readFileSync(wranglerConfigPath, "utf8");
  const match = content.match(/"account_id"\s*:\s*"([^"]+)"/);
  const accountId = match?.[1];
  if (!accountId) {
    console.error(`Missing account_id in ${wranglerConfigPath}`);
    process.exit(1);
  }
  if (accountId !== expected.account_id) {
    console.error(
      `Wrong Cloudflare account in ${wranglerConfigPath}: ${accountId}`,
    );
    console.error(
      `Expected ${expected.account_name} (${expected.account_id})`,
    );
    process.exit(1);
  }
  return accountId;
}

export function wranglerChildEnv(wranglerConfigPath: string): NodeJS.ProcessEnv {
  const accountId = assertWranglerAccount(wranglerConfigPath);
  return { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId };
}

import dns from "node:dns/promises";

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

const PRIVATE_HOSTNAME = /^(localhost|.*\.local|.*\.internal|.*\.corp)$/i;

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some((r) => r.test(ip));
}

export function assertPublicUrlSync(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed");
  }

  const hostname = parsed.hostname;

  if (PRIVATE_HOSTNAME.test(hostname)) {
    throw new Error(`URL resolves to a private/reserved address: ${hostname}`);
  }

  if (isPrivateIp(hostname)) {
    throw new Error(`URL resolves to a private/reserved address: ${hostname}`);
  }
}

export async function assertPublicUrl(rawUrl: string): Promise<void> {
  assertPublicUrlSync(rawUrl);

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }

  const hostname = parsed.hostname;

  try {
    const { address } = await dns.lookup(hostname, { family: 4 });
    if (isPrivateIp(address)) {
      throw new Error(`URL resolves to a private/reserved address: ${address}`);
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("URL resolves")) {
      throw err;
    }
  }
}

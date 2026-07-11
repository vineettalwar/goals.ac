import dns from "node:dns/promises";

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

const PRIVATE_IPV6 = [
  /^::1$/,
  /^::$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^2002:0*a/i,
  /^2002:0*ac1[0-9a-f]/i,
  /^2002:0*c0a8/i,
];

const IPV4_MAPPED_V6 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

const PRIVATE_HOSTNAME = /^(localhost|.*\.local|.*\.internal|.*\.corp|.*\.example\.com)$/i;

function isPrivateIp(ip: string): boolean {
  if (PRIVATE_IP_RANGES.some((r) => r.test(ip))) return true;

  const v4Match = ip.match(IPV4_MAPPED_V6);
  if (v4Match) return PRIVATE_IP_RANGES.some((r) => r.test(v4Match[1]));

  return PRIVATE_IPV6.some((r) => r.test(ip));
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

  const results = await Promise.allSettled([
    dns.lookup(hostname, { family: 4 }),
    dns.lookup(hostname, { family: 6 }),
  ]);

  let resolvedAtLeastOne = false;

  for (const result of results) {
    if (result.status === "rejected") {
      continue;
    }
    resolvedAtLeastOne = true;
    const { address } = result.value;
    if (isPrivateIp(address)) {
      throw new Error(`URL resolves to a private/reserved address: ${address}`);
    }
  }

  if (!resolvedAtLeastOne) {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }
}

import http from "node:http";
import https from "node:https";
import { assertPublicUrl } from "@workspace/security/ssrf-guard";
import { pageFetchErrorMessage } from "./fetch-errors";
import { AUDIT_USER_AGENT } from "./site-audit/issue-types";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECT_HOPS = 5;
/** Google and similar hosts dump large Set-Cookie bags; Node/undici default is 16KB. */
const MAX_RESPONSE_HEADER_BYTES = 64 * 1024;

export type FetchPublicTextOptions = {
  timeoutMs?: number;
  accept?: string;
  /** Inject for tests */
  fetchImpl?: typeof fetch;
};

type NodeFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs: number;
};

/**
 * GET via node:http(s) with a raised header ceiling. Global fetch (undici)
 * hard-fails with UND_ERR_HEADERS_OVERFLOW on sites like gemini.google.com.
 */
function nodeHttpGet(url: string, init: NodeFetchInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const ok = (res: Response) => {
      if (settled) return;
      settled = true;
      resolve(res);
    };

    const parsed = new URL(url);
    const transport = parsed.protocol === "https:" ? https : http;
    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: init.method ?? "GET",
        headers: init.headers,
        maxHeaderSize: MAX_RESPONSE_HEADER_BYTES,
        timeout: init.timeoutMs,
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        incoming.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        incoming.on("end", () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers)) {
            if (value == null) continue;
            if (Array.isArray(value)) {
              for (const item of value) headers.append(key, item);
            } else {
              headers.set(key, value);
            }
          }
          ok(
            new Response(Buffer.concat(chunks), {
              status: incoming.statusCode ?? 0,
              headers,
            }),
          );
        });
        incoming.on("error", fail);
      },
    );

    req.on("timeout", () => {
      req.destroy();
      fail(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    });
    req.on("error", fail);

    if (init.signal) {
      if (init.signal.aborted) {
        req.destroy();
        fail(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        return;
      }
      init.signal.addEventListener(
        "abort",
        () => {
          req.destroy();
          fail(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        },
        { once: true },
      );
    }

    req.end();
  });
}

async function defaultFetch(url: string, init: RequestInit & { timeoutMs: number }): Promise<Response> {
  const headers: Record<string, string> = {};
  const raw = init.headers;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw instanceof Headers) {
      raw.forEach((value, key) => {
        headers[key] = value;
      });
    } else {
      for (const [key, value] of Object.entries(raw)) {
        if (typeof value === "string") headers[key] = value;
      }
    }
  }

  try {
    return await nodeHttpGet(url, {
      method: typeof init.method === "string" ? init.method : "GET",
      headers,
      signal: init.signal ?? undefined,
      timeoutMs: init.timeoutMs,
    });
  } catch (err) {
    // Workers / non-Node runtimes: fall back to platform fetch.
    if (
      err instanceof Error &&
      (err.message.includes("not implemented") ||
        err.message.includes("ENOENT") ||
        (err as NodeJS.ErrnoException).code === "ERR_UNKNOWN_BUILTIN_MODULE")
    ) {
      return await fetch(url, init);
    }
    throw err;
  }
}

/**
 * GET a public URL as text. Follows redirects by hand and re-runs
 * assertPublicUrl on every hop so a 302 to a private address cannot slip through.
 */
export async function fetchPublicText(
  url: string,
  options: FetchPublicTextOptions = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const accept = options.accept ?? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8";
  const fetchImpl = options.fetchImpl;

  await assertPublicUrl(url);

  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      const init: RequestInit & { timeoutMs: number } = {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": AUDIT_USER_AGENT,
          Accept: accept,
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeoutMs,
      };
      res = fetchImpl
        ? await fetchImpl(current, init)
        : await defaultFetch(current, init);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("HTTP ")) throw err;
      throw new Error(pageFetchErrorMessage(current, err));
    } finally {
      clearTimeout(timeout);
    }

    if (REDIRECT_STATUSES.has(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new Error(`HTTP ${res.status} redirect without Location`);
      current = new URL(location, current).toString();
      await assertPublicUrl(current);
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  throw new Error(`Exceeded ${MAX_REDIRECT_HOPS} redirects`);
}

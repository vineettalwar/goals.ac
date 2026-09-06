import assert from "node:assert/strict";
import { pageFetchErrorMessage } from "./fetch-errors";

const url = "https://example.com";

assert.equal(
  pageFetchErrorMessage(url, Object.assign(new Error("Aborted"), { name: "AbortError" })),
  "Request timed out after 10 seconds",
);

assert.equal(
  pageFetchErrorMessage(url, Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } })),
  `Could not resolve hostname for ${url}`,
);

assert.equal(
  pageFetchErrorMessage(
    url,
    Object.assign(new Error("fetch failed"), { cause: { code: "CERT_HAS_EXPIRED" } }),
  ),
  `TLS certificate error for ${url}`,
);

assert.equal(
  pageFetchErrorMessage(url, new Error("fetch failed")),
  `Could not reach ${url}`,
);

assert.equal(
  pageFetchErrorMessage(
    url,
    Object.assign(new Error("Headers Overflow Error"), { cause: { code: "UND_ERR_HEADERS_OVERFLOW" } }),
  ),
  `Response headers too large from ${url}`,
);

assert.equal(pageFetchErrorMessage(url, new Error("HTTP 403: Forbidden")), "HTTP 403: Forbidden");

console.log("fetch-errors.test.ts: ok");

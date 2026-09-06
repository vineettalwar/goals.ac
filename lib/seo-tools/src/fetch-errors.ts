function causeCode(err: unknown): string {
  if (!(err instanceof Error) || err.cause == null || typeof err.cause !== "object") return "";
  const code = (err.cause as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

function errCode(err: unknown): string {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return causeCode(err);
}

/** Map undici/Node fetch failures to a short user-facing reason. */
export function pageFetchErrorMessage(url: string, err: unknown): string {
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
    return "Request timed out after 10 seconds";
  }
  const code = errCode(err);
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return `Could not resolve hostname for ${url}`;
  if (code === "ECONNREFUSED") return `Connection refused by ${url}`;
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return `Connection timed out for ${url}`;
  }
  if (code === "UND_ERR_HEADERS_OVERFLOW" || code === "HPE_HEADER_OVERFLOW") {
    return `Response headers too large from ${url}`;
  }
  if (
    code.includes("CERT") ||
    code === "ERR_TLS_CERT_ALTNAME_INVALID" ||
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
  ) {
    return `TLS certificate error for ${url}`;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("fetch failed") || message.includes("network")) {
    return `Could not reach ${url}`;
  }
  return message;
}

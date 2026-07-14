const CONNECTOR_FETCH_TIMEOUT_MS = 30_000;

export function connectorFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const signal =
    init?.signal ??
    (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(CONNECTOR_FETCH_TIMEOUT_MS)
      : undefined);

  return fetch(input, {
    ...init,
    ...(signal ? { signal } : {}),
  });
}

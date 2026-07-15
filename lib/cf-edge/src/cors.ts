const DEFAULT_ORIGINS = [
  "https://goals.ac",
  "https://www.goals.ac",
  "https://app.goals.ac",
  "https://goals-ac-app.pages.dev",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:3001",
  "http://localhost:8787",
];

export function corsHeaders(
  request: Request,
  extraOrigins: string[] = [],
): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = new Set([...DEFAULT_ORIGINS, ...extraOrigins]);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
    "Access-Control-Allow-Credentials": "true",
  };
  const originAllowed =
    origin &&
    (allowed.has(origin) ||
      /^https:\/\/[a-z0-9-]+\.goals-ac-app\.pages\.dev$/i.test(origin));
  if (originAllowed) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

export function withCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(request))) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsPreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

/** Response for edge routes that exist in local Next.js but are not yet ported. */
export function edgeNotImplementedResponse(
  request: Request,
  code = "EDGE_ROUTE_NOT_IMPLEMENTED",
): Response {
  return Response.json(
    {
      error: "Not implemented on edge",
      code,
      hint: "Use job polling for async writes; see docs/parity-matrix.md",
    },
    { status: 501, headers: { "Cache-Control": "no-store" } },
  );
}

export function isUnimplementedGeneratePath(path: string, method: string): boolean {
  if (method !== "POST") return false;
  if (path.startsWith("/api/public/")) return false;
  return path.includes("/generate") || path.includes("/stream");
}

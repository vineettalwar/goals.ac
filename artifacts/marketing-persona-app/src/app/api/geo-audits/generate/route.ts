import { proxyToExpress, toExpressGeoAuditBody } from "@/lib/express-proxy";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return proxyToExpress("/geo-audits", {
    method: "POST",
    body: JSON.stringify(toExpressGeoAuditBody(body as Record<string, unknown>)),
    attachSession: true,
  });
}

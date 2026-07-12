import { proxyToExpress, toExpressCompetitorBody } from "@/lib/express-proxy";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return proxyToExpress("/competitor-analysis", {
    method: "POST",
    body: JSON.stringify(toExpressCompetitorBody(body as Record<string, unknown>)),
  });
}

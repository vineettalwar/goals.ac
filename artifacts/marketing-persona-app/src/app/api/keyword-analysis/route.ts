import { proxyToExpress, toExpressKeywordBody } from "@/lib/express-proxy";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return proxyToExpress("/keyword-analysis", {
    method: "POST",
    body: JSON.stringify(toExpressKeywordBody(body as Record<string, unknown>)),
  });
}

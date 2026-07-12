import { proxyToExpress } from "@/lib/express-proxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToExpress(`/geo-audits/${id}`, {
    method: "GET",
    attachSession: false,
  });
}

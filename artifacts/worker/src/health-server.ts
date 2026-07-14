import { createServer, type Server } from "node:http";
import type { Logger } from "pino";

let server: Server | null = null;

/** Minimal HTTP health endpoint for container orchestrators. */
export function startHealthServer(logger: Logger): void {
  const port = Number.parseInt(process.env.WORKER_HEALTH_PORT ?? "8090", 10);
  if (!Number.isFinite(port) || port <= 0) return;

  server = createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "goals-ac-worker" }));
      return;
    }
    res.writeHead(404).end();
  });

  server.listen(port, () => {
    logger.info({ port }, "Worker health server listening");
  });
}

export async function stopHealthServer(): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
}

import express from "express";
import healthRouter from "./routes/health.js";
import contentRouter from "./routes/content.js";
import schemaRouter from "./routes/schema.js";
import siteGraphRouter from "./routes/site-graph.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

// Parse JSON bodies (raw body needed for HMAC — store before parsing)
app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf.toString();
  },
}));

// Mount all routes under /goals-ac/v1/
app.use("/goals-ac/v1", healthRouter);
app.use("/goals-ac/v1", contentRouter);
app.use("/goals-ac/v1", schemaRouter);
app.use("/goals-ac/v1", siteGraphRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[shopify-app] goals.ac Shopify App listening on port ${PORT}`);
  console.log(`[shopify-app] Health: http://localhost:${PORT}/goals-ac/v1/health`);
});

export default app;

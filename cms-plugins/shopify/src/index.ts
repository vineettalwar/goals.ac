import express from "express";
import healthRouter from "./routes/health.js";
import contentRouter from "./routes/content.js";
import schemaRouter from "./routes/schema.js";
import siteGraphRouter from "./routes/site-graph.js";
import { errorHandler, notFound, requestContext } from "./lib/errors.js";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.disable("x-powered-by");
app.use(requestContext);

// Parse JSON bodies (raw body needed for HMAC — store before parsing).
// 8mb covers PNG/JPEG featured data URIs (~5MB decoded + markdown body).
app.use(express.json({
  limit: "8mb",
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
app.use(notFound);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.info(JSON.stringify({
    level: "info",
    time: new Date().toISOString(),
    service: "goals-ac-shopify",
    message: "Server listening",
    port: PORT,
  }));
});

export default app;

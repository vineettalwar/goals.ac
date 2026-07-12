import path from "path";
import { fileURLToPath } from "url";
import { runMigrations } from "@workspace/db/migrate";
import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { validateProductionEnvironment } from "./lib/config";

validateProductionEnvironment();

const rawPort =
  process.env["PORT"] ??
  process.env["API_PORT"] ??
  (process.env.NODE_ENV === "production" ? undefined : "8080");

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "migrations");

runMigrations(migrationsFolder)
  .then(() => {
    const server = app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });

    let isShuttingDown = false;
    const shutdown = (signal: NodeJS.Signals) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info({ signal }, "Graceful shutdown started");

      const forceExit = setTimeout(() => {
        logger.error("Graceful shutdown timed out");
        process.exit(1);
      }, 10_000);
      forceExit.unref();

      server.close(async (closeError) => {
        try {
          await pool.end();
        } catch (poolError) {
          logger.error({ err: poolError }, "Failed to close database pool");
        }

        if (closeError) {
          logger.error({ err: closeError }, "Failed to close HTTP server");
          process.exit(1);
        }
        logger.info("Graceful shutdown complete");
        process.exit(0);
      });
    };

    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  })
  .catch((err) => {
    logger.error({ err }, "Migration failed, aborting startup");
    process.exit(1);
  });

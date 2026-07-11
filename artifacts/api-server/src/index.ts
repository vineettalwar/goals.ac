import path from "path";
import { fileURLToPath } from "url";
import { runMigrations } from "@workspace/db/migrate";
import app from "./app";
import { logger } from "./lib/logger";

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
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Migration failed, aborting startup");
    process.exit(1);
  });

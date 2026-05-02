import { runMigrations } from "./migrate.js";

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

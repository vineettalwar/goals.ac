import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema-sqlite/index.ts",
  out: "./migrations-d1",
  dialect: "sqlite",
});

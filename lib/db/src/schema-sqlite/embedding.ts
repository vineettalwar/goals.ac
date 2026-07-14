/** SQLite/D1 embedding storage — JSON float array (768-dim Gemini text-embedding-004). */
import { text } from "drizzle-orm/sqlite-core";

export function embedding768(name: string) {
  return text(name, { mode: "json" }).$type<number[]>().notNull();
}

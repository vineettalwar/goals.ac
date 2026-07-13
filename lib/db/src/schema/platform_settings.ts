import { pgTable, serial, boolean, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

/** Singleton platform-wide settings (one row, id=1). */
export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  platformEnabled: boolean("platform_enabled").notNull().default(true),
  aiGenerationEnabled: boolean("ai_generation_enabled").notNull().default(true),
  maintenanceMessage: text("maintenance_message"),
  updatedBy: integer("updated_by").references(() => usersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettingsTable.$inferSelect;

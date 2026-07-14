import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  avatarUrl: text("avatar_url"),
  encryptedGeminiKey: text("encrypted_gemini_key"),
  /** gemini | bedrock | ollama — in-app preference; env AI_PROVIDER is fallback */
  aiProvider: text("ai_provider"),
  ollamaBaseUrl: text("ollama_base_url"),
  ollamaModel: text("ollama_model"),
  // starter | growth | scale
  plan: text("plan").notNull().default("starter"),
  /** e.g. home-roadmap-generator — where the user started signup */
  signupReferrer: text("signup_referrer"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: integer("password_reset_expires", { mode: "timestamp_ms" }),
  mfaEnabled: integer("mfa_enabled", { mode: "boolean" }).notNull().default(false),
  encryptedTotpSecret: text("encrypted_totp_secret"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

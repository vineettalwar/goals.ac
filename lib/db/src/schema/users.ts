import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
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
  passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

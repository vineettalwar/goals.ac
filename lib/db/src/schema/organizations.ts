import { pgTable, serial, text, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";
import type { EncryptedStockCredentialsMap } from "./stock-credentials";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** starter | growth | scale — billing tier for site limits and quotas */
  plan: text("plan").notNull().default("starter"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** Stripe subscription status: active, past_due, canceled, trialing, etc. */
  subscriptionStatus: text("subscription_status"),
  stripePriceId: text("stripe_price_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
  encryptedGeminiKey: text("encrypted_gemini_key"),
  encryptedBedrockAccessKeyId: text("encrypted_bedrock_access_key_id"),
  encryptedBedrockSecretAccessKey: text("encrypted_bedrock_secret_access_key"),
  encryptedBedrockSessionToken: text("encrypted_bedrock_session_token"),
  bedrockRegion: text("bedrock_region"),
  bedrockModel: text("bedrock_model"),
  encryptedOpenaiApiKey: text("encrypted_openai_api_key"),
  encryptedAnthropicApiKey: text("encrypted_anthropic_api_key"),
  /** gemini | bedrock | ollama | openai | anthropic — in-app preference; env AI_PROVIDER is fallback */
  aiProvider: text("ai_provider"),
  ollamaBaseUrl: text("ollama_base_url"),
  ollamaModel: text("ollama_model"),
  encryptedSemrushApiKey: text("encrypted_semrush_api_key"),
  semrushDatabase: text("semrush_database").default("us"),
  /** Org BYOK DeepL API key (AES-256-GCM ciphertext). */
  encryptedDeeplApiKey: text("encrypted_deepl_api_key"),
  /** Org BYOK stock photo API keys by provider id (AES-256-GCM ciphertext per entry). */
  encryptedStockCredentials: jsonb("encrypted_stock_credentials").$type<EncryptedStockCredentialsMap | null>(),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  suspendedReason: text("suspended_reason"),
  securitySettings: jsonb("security_settings").$type<OrgSecuritySettings | null>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("organizations_owner_id_idx").on(table.ownerId),
  index("organizations_company_id_idx").on(table.companyId),
  index("organizations_stripe_customer_id_idx").on(table.stripeCustomerId),
]);

export type OrgSecuritySettings = {
  requireMfa?: boolean;
  allowedIps?: string[];
  maxSessionAgeHours?: number;
  allowCrossProjectEditors?: boolean;
  ssoConfig?: {
    provider?: string;
    issuer?: string;
    clientId?: string;
    domain?: string;
  };
};

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;

const DEVELOPMENT_SECRET_MARKERS = ["change-me", "dev-only", "secret-change"];

function requireStrongSecret(name: string): void {
  const value = process.env[name]?.trim();
  if (!value || value.length < 32) {
    throw new Error(`${name} must be set to at least 32 characters in production.`);
  }
  if (DEVELOPMENT_SECRET_MARKERS.some((marker) => value.includes(marker))) {
    throw new Error(`${name} still contains a development placeholder.`);
  }
}

export function validateProductionEnvironment(): void {
  if (process.env["NODE_ENV"] !== "production") return;

  requireStrongSecret("JWT_SECRET");
  requireStrongSecret("GEMINI_KEY_ENCRYPTION_SECRET");

  const origins = process.env["APP_ORIGIN"]?.split(",") ?? [];
  if (origins.length === 0) {
    throw new Error("APP_ORIGIN is required in production.");
  }
  for (const origin of origins) {
    const parsed = new URL(origin.trim());
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
      throw new Error("APP_ORIGIN must use HTTPS in production.");
    }
  }
}

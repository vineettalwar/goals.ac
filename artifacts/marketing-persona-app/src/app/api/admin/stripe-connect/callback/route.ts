import { requirePlatformAdminApi } from "@/lib/auth/require-platform-admin";
import {
  adminIntegrationsRedirect,
  decodeStripeConnectState,
  exchangeStripeConnectCode,
  saveStripeConnectTokens,
} from "@/lib/platform/stripe-connect-oauth";

export async function GET(req: Request) {
  const admin = await requirePlatformAdminApi();
  if (admin.error) return admin.error;

  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    adminIntegrationsRedirect({
      stripe: "connect_error",
      message: errorDescription ?? error,
    });
  }

  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) {
    adminIntegrationsRedirect({ stripe: "connect_error", message: "Missing OAuth code" });
  }

  const state = decodeStripeConnectState(stateRaw);
  if (!state || state.userId !== admin.userId) {
    adminIntegrationsRedirect({ stripe: "connect_error", message: "Invalid OAuth state" });
  }

  try {
    const tokens = await exchangeStripeConnectCode(code);
    await saveStripeConnectTokens(tokens, admin.userId!);
    adminIntegrationsRedirect({ stripe: "connected" });
  } catch (err) {
    adminIntegrationsRedirect({
      stripe: "connect_error",
      message: err instanceof Error ? err.message : "Connect failed",
    });
  }
}

import assert from "node:assert/strict";
import { resolveGoogleOAuthCredentials } from "./google-oauth-credentials";
import { isGoogleManagedByEnv } from "./platform-integration-defs";

const origId = process.env.GOOGLE_CLIENT_ID;
const origSecret = process.env.GOOGLE_CLIENT_SECRET;

try {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  assert.equal(isGoogleManagedByEnv(), false);

  const fromArg = await resolveGoogleOAuthCredentials({
    GOOGLE_CLIENT_ID: "arg-id.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "arg-secret",
  });
  assert.equal(fromArg?.source, "env");
  assert.equal(fromArg?.clientId, "arg-id.apps.googleusercontent.com");
  assert.equal(fromArg?.clientSecret, "arg-secret");

  process.env.GOOGLE_CLIENT_ID = "env-id";
  process.env.GOOGLE_CLIENT_SECRET = "env-secret";
  assert.equal(isGoogleManagedByEnv(), true);
  const fromProcess = await resolveGoogleOAuthCredentials();
  assert.equal(fromProcess?.source, "env");
  assert.equal(fromProcess?.clientId, "env-id");

  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  assert.equal(isGoogleManagedByEnv(), false);
  let withoutEnv: Awaited<ReturnType<typeof resolveGoogleOAuthCredentials>> = null;
  try {
    withoutEnv = await resolveGoogleOAuthCredentials({});
  } catch {
    withoutEnv = null;
  }
  assert.notEqual(withoutEnv?.source, "env");
} finally {
  if (origId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = origId;
  if (origSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
  else process.env.GOOGLE_CLIENT_SECRET = origSecret;
}

console.log("google-oauth-credentials: ok");

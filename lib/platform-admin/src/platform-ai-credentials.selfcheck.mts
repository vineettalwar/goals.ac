import assert from "node:assert/strict";
import {
  PLATFORM_AI_KEY_PROVIDERS,
  buildPlatformAiKeyStatus,
  buildPlatformOllamaStatus,
  isPlatformAiIntegrationId,
} from "./platform-ai-credentials.js";

// ponytail: assert-based self-check — fails if provider map / status builders drift

assert.equal(PLATFORM_AI_KEY_PROVIDERS.length, 6);
assert.ok(isPlatformAiIntegrationId("openrouter"));
assert.ok(isPlatformAiIntegrationId("ollama"));
assert.equal(isPlatformAiIntegrationId("stripe"), false);

const empty = buildPlatformAiKeyStatus(null, PLATFORM_AI_KEY_PROVIDERS[3]!);
assert.equal(PLATFORM_AI_KEY_PROVIDERS[3]!.id, "openrouter");
assert.equal(empty.configured, false);
assert.equal(empty.apiKey.configured, false);
assert.ok(empty.model);

const ollama = buildPlatformOllamaStatus(null);
assert.equal(ollama.configured, false);

const withDb = buildPlatformAiKeyStatus(
  {
    encryptedGeminiApiKey: null,
    encryptedOpenaiApiKey: null,
    encryptedAnthropicApiKey: null,
    encryptedOpenrouterApiKey: null,
    openrouterModel: "openai/gpt-4.1-mini",
    encryptedGroqApiKey: null,
    groqModel: null,
    encryptedNvidiaApiKey: null,
    nvidiaModel: null,
    ollamaBaseUrl: null,
    ollamaModel: null,
  },
  PLATFORM_AI_KEY_PROVIDERS[3]!,
);
assert.equal(withDb.model?.value, "openai/gpt-4.1-mini");
assert.equal(withDb.model?.source, "db");

console.log("platform-ai-credentials self-check ok");

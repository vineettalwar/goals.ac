import assert from "node:assert/strict";
import { parseChatAiStatus, providerPatchBody } from "./chat-ai-gate";

assert.equal(parseChatAiStatus(null), null);

const ready = parseChatAiStatus({
  ready: true,
  activeProvider: "ollama",
  gemini: { configured: true },
  ollama: { model: "llama3.2", reachable: true, baseUrl: "http://localhost:11434" },
  openrouter: { configured: true, model: "openai/gpt-4.1-mini" },
});
assert.equal(ready?.ready, true);
assert.equal(ready?.modelLabel, "ollama · llama3.2");
assert.deepEqual(
  ready?.options.map((row) => row.id),
  ["gemini", "openrouter", "ollama"],
);

const blocked = parseChatAiStatus({
  ready: false,
  activeProvider: "ollama",
  ollama: { model: "llama3.2", reachable: false },
});
assert.equal(blocked?.ready, false);
assert.match(blocked?.detail ?? "", /reachable/i);
assert.equal(blocked?.options[0]?.id, "ollama");

const gemini = parseChatAiStatus({
  ready: true,
  activeProvider: "gemini",
  gemini: { configured: true },
});
assert.equal(gemini?.modelLabel, "gemini");
assert.equal(gemini?.options.length, 1);

assert.deepEqual(providerPatchBody({ provider: "openrouter", model: "openai/gpt-4.1-mini" }), {
  provider: "openrouter",
  ollamaBaseUrl: null,
  ollamaModel: null,
  openrouterModel: "openai/gpt-4.1-mini",
  nvidiaModel: null,
});

console.log("chat-ai-gate: ok");

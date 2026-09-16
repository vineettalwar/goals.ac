"use client";

import { useState } from "react";
import type { AiProviderChoice, BedrockCredentialsForm } from "@workspace/app-shell/settings";

function credentialTestResult(data: { ok?: boolean; error?: string }) {
  return { ok: Boolean(data.ok), error: data.error };
}

export function useOrgByokControllers(reload: (showLoading?: boolean) => Promise<void>) {
  const [geminiSaving, setGeminiSaving] = useState(false);
  const [geminiDeleting, setGeminiDeleting] = useState(false);
  const [openaiSaving, setOpenaiSaving] = useState(false);
  const [openaiDeleting, setOpenaiDeleting] = useState(false);
  const [openrouterSaving, setOpenrouterSaving] = useState(false);
  const [openrouterDeleting, setOpenrouterDeleting] = useState(false);
  const [groqSaving, setGroqSaving] = useState(false);
  const [groqDeleting, setGroqDeleting] = useState(false);
  const [nvidiaSaving, setNvidiaSaving] = useState(false);
  const [nvidiaDeleting, setNvidiaDeleting] = useState(false);
  const [anthropicSaving, setAnthropicSaving] = useState(false);
  const [anthropicDeleting, setAnthropicDeleting] = useState(false);
  const [bedrockSaving, setBedrockSaving] = useState(false);
  const [bedrockDeleting, setBedrockDeleting] = useState(false);
  const [providerSaving, setProviderSaving] = useState(false);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [semrushSaving, setSemrushSaving] = useState(false);
  const [semrushDeleting, setSemrushDeleting] = useState(false);
  const [deeplSaving, setDeeplSaving] = useState(false);
  const [deeplDeleting, setDeeplDeleting] = useState(false);
  const [stockSavingProvider, setStockSavingProvider] = useState<string | null>(null);
  const [stockRemovingProvider, setStockRemovingProvider] = useState<string | null>(null);
  const [toolsMessage, setToolsMessage] = useState<string | null>(null);

  async function testGeminiKey(key: string) {
    const res = await fetch("/api/auth/api-key/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveGeminiKey(key: string) {
    setGeminiSaving(true);
    try {
      const res = await fetch("/api/auth/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setGeminiSaving(false);
    }
  }

  async function deleteGeminiKey() {
    if (!window.confirm("Remove the organization Gemini API key?")) return;
    setGeminiDeleting(true);
    try {
      const res = await fetch("/api/auth/api-key", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setGeminiDeleting(false);
    }
  }

  async function saveProvider(input: {
    provider: AiProviderChoice;
    ollamaBaseUrl: string;
    ollamaModel: string;
    openrouterModel: string;
    nvidiaModel: string;
  }) {
    setProviderSaving(true);
    setProviderMessage(null);
    try {
      const res = await fetch("/api/ai-providers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: input.provider,
          ollamaBaseUrl: input.provider === "ollama" ? input.ollamaBaseUrl : null,
          ollamaModel: input.provider === "ollama" ? input.ollamaModel : null,
          openrouterModel: input.provider === "openrouter" ? input.openrouterModel : null,
          nvidiaModel: input.provider === "nvidia" ? input.nvidiaModel : null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Failed to save provider");
      await reload(false);
      setProviderMessage("AI provider updated.");
    } catch (err) {
      setProviderMessage(err instanceof Error ? err.message : "Failed to save provider");
      throw err;
    } finally {
      setProviderSaving(false);
    }
  }

  async function testOpenaiKey(key: string) {
    const res = await fetch("/api/auth/openai-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveOpenaiKey(key: string) {
    setOpenaiSaving(true);
    try {
      const res = await fetch("/api/auth/openai-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setOpenaiSaving(false);
    }
  }

  async function deleteOpenaiKey() {
    if (!window.confirm("Remove the organization OpenAI API key?")) return;
    setOpenaiDeleting(true);
    try {
      const res = await fetch("/api/auth/openai-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setOpenaiDeleting(false);
    }
  }

  async function testOpenrouterKey(key: string) {
    const res = await fetch("/api/auth/openrouter-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveOpenrouterKey(key: string) {
    setOpenrouterSaving(true);
    try {
      const res = await fetch("/api/auth/openrouter-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setOpenrouterSaving(false);
    }
  }

  async function deleteOpenrouterKey() {
    if (!window.confirm("Remove the organization OpenRouter API key?")) return;
    setOpenrouterDeleting(true);
    try {
      const res = await fetch("/api/auth/openrouter-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setOpenrouterDeleting(false);
    }
  }

  async function testGroqKey(key: string) {
    const res = await fetch("/api/auth/groq-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveGroqKey(key: string) {
    setGroqSaving(true);
    try {
      const res = await fetch("/api/auth/groq-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setGroqSaving(false);
    }
  }

  async function deleteGroqKey() {
    if (!window.confirm("Remove the organization Groq API key?")) return;
    setGroqDeleting(true);
    try {
      const res = await fetch("/api/auth/groq-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setGroqDeleting(false);
    }
  }

  async function testNvidiaKey(key: string) {
    const res = await fetch("/api/auth/nvidia-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveNvidiaKey(key: string) {
    setNvidiaSaving(true);
    try {
      const res = await fetch("/api/auth/nvidia-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setNvidiaSaving(false);
    }
  }

  async function deleteNvidiaKey() {
    if (!window.confirm("Remove the organization NVIDIA API key?")) return;
    setNvidiaDeleting(true);
    try {
      const res = await fetch("/api/auth/nvidia-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setNvidiaDeleting(false);
    }
  }

  async function testAnthropicKey(key: string) {
    const res = await fetch("/api/auth/anthropic-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveAnthropicKey(key: string) {
    setAnthropicSaving(true);
    try {
      const res = await fetch("/api/auth/anthropic-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error("Failed to save key");
      await reload(false);
    } finally {
      setAnthropicSaving(false);
    }
  }

  async function deleteAnthropicKey() {
    if (!window.confirm("Remove the organization Anthropic API key?")) return;
    setAnthropicDeleting(true);
    try {
      const res = await fetch("/api/auth/anthropic-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove key");
      await reload(false);
    } finally {
      setAnthropicDeleting(false);
    }
  }

  function bedrockPayloadFromForm(form: BedrockCredentialsForm) {
    const apiKey = form.apiKey.trim();
    const model = form.model.trim();
    return apiKey ? { apiKey, ...(model ? { model } : {}) } : { model };
    // Omit empty apiKey so PATCH takes the model-only path when replacing model only.
    return apiKey ? { apiKey, model } : { model };
  }

  async function testBedrockCredentials(form: BedrockCredentialsForm) {
    const res = await fetch("/api/auth/bedrock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bedrockPayloadFromForm(form)),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveBedrockCredentials(form: BedrockCredentialsForm) {
    setBedrockSaving(true);
    try {
      const res = await fetch("/api/auth/bedrock-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bedrockPayloadFromForm(form)),
      });
      if (!res.ok) throw new Error("Failed to save credentials");
      await reload(false);
    } finally {
      setBedrockSaving(false);
    }
  }

  async function deleteBedrockCredentials() {
    if (!window.confirm("Remove the organization AWS Bedrock credentials?")) return;
    setBedrockDeleting(true);
    try {
      const res = await fetch("/api/auth/bedrock-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove credentials");
      await reload(false);
    } finally {
      setBedrockDeleting(false);
    }
  }

  async function testSemrushCredentials(input: { apiKey: string; database: string }) {
    const res = await fetch("/api/auth/semrush-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return credentialTestResult((await res.json()) as { ok?: boolean; error?: string });
  }

  async function saveSemrushCredentials(input: { apiKey: string; database: string }) {
    setSemrushSaving(true);
    setToolsMessage(null);
    try {
      const res = await fetch("/api/auth/semrush-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to save Semrush credentials");
      await reload(false);
      setToolsMessage("Semrush API key saved.");
    } catch (err) {
      setToolsMessage(err instanceof Error ? err.message : "Failed to save Semrush credentials");
      throw err;
    } finally {
      setSemrushSaving(false);
    }
  }

  async function deleteSemrushCredentials() {
    if (!window.confirm("Remove the organization Semrush API key?")) return;
    setSemrushDeleting(true);
    setToolsMessage(null);
    try {
      const res = await fetch("/api/auth/semrush-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove Semrush credentials");
      await reload(false);
      setToolsMessage("Semrush credentials removed.");
    } catch (err) {
      setToolsMessage(err instanceof Error ? err.message : "Failed to remove Semrush credentials");
      throw err;
    } finally {
      setSemrushDeleting(false);
    }
  }

  async function testDeeplKey(key: string) {
    const res = await fetch("/api/auth/deepl-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; note?: string };
    return { ...credentialTestResult(data), note: data.note };
  }

  async function saveDeeplKey(key: string) {
    setDeeplSaving(true);
    setToolsMessage(null);
    try {
      const res = await fetch("/api/auth/deepl-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      if (!res.ok) throw new Error("Failed to save DeepL key");
      await reload(false);
      setToolsMessage("DeepL API key saved.");
    } catch (err) {
      setToolsMessage(err instanceof Error ? err.message : "Failed to save DeepL key");
      throw err;
    } finally {
      setDeeplSaving(false);
    }
  }

  async function deleteDeeplKey() {
    if (!window.confirm("Remove the organization DeepL API key?")) return;
    setDeeplDeleting(true);
    setToolsMessage(null);
    try {
      const res = await fetch("/api/auth/deepl-credentials", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove DeepL key");
      await reload(false);
      setToolsMessage("DeepL API key removed.");
    } catch (err) {
      setToolsMessage(err instanceof Error ? err.message : "Failed to remove DeepL key");
      throw err;
    } finally {
      setDeeplDeleting(false);
    }
  }

  async function testStockCredentials(input: { provider: string; apiKey: string }) {
    const res = await fetch("/api/auth/stock-credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; note?: string };
    return { ...credentialTestResult(data), note: data.note };
  }

  async function saveStockCredentials(input: { provider: string; apiKey: string }) {
    setStockSavingProvider(input.provider);
    setToolsMessage(null);
    try {
      const res = await fetch("/api/auth/stock-credentials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Failed to save stock credentials");
      await reload(false);
      setToolsMessage(`${input.provider} API key saved.`);
    } catch (err) {
      setToolsMessage(err instanceof Error ? err.message : "Failed to save stock credentials");
      throw err;
    } finally {
      setStockSavingProvider(null);
    }
  }

  async function deleteStockCredentials(provider: string) {
    if (!window.confirm(`Remove the organization ${provider} API key?`)) return;
    setStockRemovingProvider(provider);
    setToolsMessage(null);
    try {
      const res = await fetch("/api/auth/stock-credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error("Failed to remove stock credentials");
      await reload(false);
      setToolsMessage(`${provider} API key removed.`);
    } catch (err) {
      setToolsMessage(err instanceof Error ? err.message : "Failed to remove stock credentials");
      throw err;
    } finally {
      setStockRemovingProvider(null);
    }
  }

  return {
    geminiSaving,
    geminiDeleting,
    openaiSaving,
    openaiDeleting,
    openrouterSaving,
    openrouterDeleting,
    groqSaving,
    groqDeleting,
    nvidiaSaving,
    nvidiaDeleting,
    anthropicSaving,
    anthropicDeleting,
    bedrockSaving,
    bedrockDeleting,
    providerSaving,
    providerMessage,
    semrushSaving,
    semrushDeleting,
    deeplSaving,
    deeplDeleting,
    stockSavingProvider,
    stockRemovingProvider,
    toolsMessage,
    testGeminiKey,
    saveGeminiKey,
    deleteGeminiKey,
    saveProvider,
    testOpenaiKey,
    saveOpenaiKey,
    deleteOpenaiKey,
    testOpenrouterKey,
    saveOpenrouterKey,
    deleteOpenrouterKey,
    testGroqKey,
    saveGroqKey,
    deleteGroqKey,
    testNvidiaKey,
    saveNvidiaKey,
    deleteNvidiaKey,
    testAnthropicKey,
    saveAnthropicKey,
    deleteAnthropicKey,
    testBedrockCredentials,
    saveBedrockCredentials,
    deleteBedrockCredentials,
    testSemrushCredentials,
    saveSemrushCredentials,
    deleteSemrushCredentials,
    testDeeplKey,
    saveDeeplKey,
    deleteDeeplKey,
    testStockCredentials,
    saveStockCredentials,
    deleteStockCredentials,
  };
}

"use client";

import { useEffect, useState } from "react";
import type { BedrockModelChoice } from "@workspace/ai-providers/bedrock-models";

/** Load chat models allowed for a Bedrock API key (or stored org credentials when key omitted). */
export function useBedrockAccountModels(apiKey: string, enabled: boolean) {
  const [models, setModels] = useState<BedrockModelChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = apiKey.trim();

  useEffect(() => {
    if (!enabled) {
      setModels([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Wait until a full key is pasted, or fetch with stored creds when key field is empty.
    if (trimmed.length > 0 && trimmed.length < 16) {
      setModels([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/bedrock-credentials/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trimmed.length >= 16 ? { apiKey: trimmed } : {}),
        });
        const data = (await res.json().catch(() => ({}))) as {
          models?: BedrockModelChoice[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setModels([]);
          setError(data.error ?? "Could not load models for this account");
          return;
        }
        setModels(data.models ?? []);
      } catch {
        if (!cancelled) {
          setModels([]);
          setError("Could not load models for this account");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, trimmed]);

  return { models, loading, error };
}

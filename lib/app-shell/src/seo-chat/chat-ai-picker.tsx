"use client";

import { useEffect, useState } from "react";
import type { ChatAiOption, ChatAiProviderId, ChatAiStatus } from "./chat-ai-gate";

export function ChatAiPicker({
  status,
  saving,
  aiSettingsHref,
  onSelectProvider,
  onSaveModel,
}: {
  status: ChatAiStatus;
  saving: boolean;
  aiSettingsHref: string;
  onSelectProvider: (provider: ChatAiProviderId) => void;
  onSaveModel: (provider: ChatAiProviderId, model: string) => void;
}) {
  const active = status.options.find((row) => row.id === status.activeProvider) ?? status.options[0];
  const [modelDraft, setModelDraft] = useState(active?.model ?? "");

  useEffect(() => {
    setModelDraft(active?.model ?? "");
  }, [active?.id, active?.model]);

  if (status.options.length === 0) return null;

  function commitModel(option: ChatAiOption) {
    if (!option.modelEditable) return;
    const next = modelDraft.trim();
    if (!next || next === (option.model ?? "")) return;
    onSaveModel(option.id, next);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
      <label className="sr-only" htmlFor="seo-chat-ai-provider">
        AI provider
      </label>
      <select
        id="seo-chat-ai-provider"
        value={status.activeProvider}
        disabled={saving || status.options.length < 2}
        onChange={(event) => onSelectProvider(event.target.value as ChatAiProviderId)}
        className="rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground outline-none disabled:opacity-60"
      >
        {status.options.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
            {row.model ? ` · ${row.model}` : ""}
          </option>
        ))}
      </select>
      {active?.modelEditable ? (
        <>
          <label className="sr-only" htmlFor="seo-chat-ai-model">
            Model
          </label>
          <input
            id="seo-chat-ai-model"
            value={modelDraft}
            disabled={saving}
            onChange={(event) => setModelDraft(event.target.value)}
            onBlur={() => commitModel(active)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitModel(active);
              }
            }}
            placeholder="model"
            className="min-w-40 rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground outline-none disabled:opacity-60"
          />
        </>
      ) : null}
      <a href={aiSettingsHref} className="text-primary underline-offset-2 hover:underline">
        connect more
      </a>
    </div>
  );
}

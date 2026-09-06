import { useRef } from "react";
import { ContentMarkdown } from "./content-markdown";
import { MarkdownToolbar } from "./markdown-toolbar";
import { TwitterThreadPreview } from "./twitter-thread-preview";

export function ContentPieceBodyEditor({
  editing,
  previewMode,
  canEdit,
  bodyDraft,
  displayBody,
  body,
  formatType,
  onBodyChange,
  previewOverrideBody,
}: {
  editing: boolean;
  previewMode: boolean;
  canEdit: boolean;
  bodyDraft: string;
  displayBody: string;
  body: string;
  formatType?: string;
  onBodyChange: (value: string) => void;
  /** When set (Before/After snapshot toggle), shown instead of displayBody. Read-only. */
  previewOverrideBody?: string;
}) {
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isTwitterThread = formatType === "twitter_thread";

  function renderBody(markdown: string) {
    if (isTwitterThread) {
      return <TwitterThreadPreview bodyMarkdown={markdown} />;
    }
    return <ContentMarkdown>{markdown}</ContentMarkdown>;
  }

  if (canEdit && editing) {
    return (
      <div className="min-h-105">
        {!previewMode ? (
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {isTwitterThread
                  ? "Markdown source · one tweet per 1/ 2/ 3/ block (multi-line OK)"
                  : "Markdown source"}
              </p>
              <MarkdownToolbar
                textareaRef={bodyTextareaRef}
                value={bodyDraft}
                onChange={onBodyChange}
              />
            </div>
            <textarea
              ref={bodyTextareaRef}
              value={bodyDraft}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={24}
              className="min-h-105 w-full resize-y border-0 bg-transparent p-0 font-mono text-sm leading-relaxed text-foreground shadow-none outline-none"
              aria-label="Body markdown"
            />
          </div>
        ) : (
          <div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">{renderBody(bodyDraft || "")}</div>
        )}
      </div>
    );
  }

  const shownBody = previewOverrideBody ?? displayBody;
  const shownBodyTrimmed = previewOverrideBody ? previewOverrideBody.trim() : body;

  return (
    <div className="px-5 py-6 sm:px-6 lg:px-8 lg:py-8">
      {shownBodyTrimmed ? (
        renderBody(shownBody)
      ) : (
        <p className="text-sm text-muted-foreground">
          No content yet. Generate or edit to add copy.
        </p>
      )}
    </div>
  );
}

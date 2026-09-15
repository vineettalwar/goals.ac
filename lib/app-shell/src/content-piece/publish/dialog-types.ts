export type RenderPreviewResult = {
  payloadKind?: string;
  previewHtml?: string | null;
  previewJson?: unknown;
  warnings?: Array<{ code?: string; message: string }>;
};

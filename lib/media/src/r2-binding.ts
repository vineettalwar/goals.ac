/** Minimal R2 bucket surface for Workers bindings. */
export type ContentMediaR2Binding = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
};

let contentMediaR2: ContentMediaR2Binding | null = null;

export function setContentMediaR2Binding(binding: ContentMediaR2Binding | null): void {
  contentMediaR2 = binding;
}

export function getContentMediaR2Binding(): ContentMediaR2Binding | null {
  return contentMediaR2;
}

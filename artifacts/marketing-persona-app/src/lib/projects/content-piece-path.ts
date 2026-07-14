/** Canonical in-app URL for a content piece editor. */
export function contentPiecePath(
  projectId: number | string,
  pieceId: number | string,
): string {
  return `/projects/${projectId}/content-piece/${pieceId}`;
}

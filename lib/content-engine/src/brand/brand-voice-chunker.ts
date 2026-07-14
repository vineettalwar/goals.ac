/** Approximate token count (~4 chars per token for English prose). */
export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export interface TextChunk {
  text: string;
  chunkIndex: number;
  tokenCount: number;
}

const DEFAULT_CHUNK_TOKENS = 500;
const DEFAULT_OVERLAP_TOKENS = 80;

/**
 * Split text into overlapping chunks, preferring heading boundaries for markdown/HTML-ish content.
 */
export function chunkText(
  text: string,
  options?: { maxTokens?: number; overlapTokens?: number },
): TextChunk[] {
  const maxTokens = options?.maxTokens ?? DEFAULT_CHUNK_TOKENS;
  const overlapTokens = options?.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections = normalized.split(/(?=^#{1,3}\s)/m).filter(Boolean);
  const paragraphs =
    sections.length > 1
      ? sections
      : normalized.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  const chunks: TextChunk[] = [];
  let buffer = "";

  function flushBuffer(): void {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    chunks.push({
      text: trimmed,
      chunkIndex: chunks.length,
      tokenCount: estimateTokenCount(trimmed),
    });
  }

  function carryOverlap(text: string): string {
    const words = text.split(/\s+/);
    const overlapChars = overlapTokens * 4;
    let carried = "";
    for (let i = words.length - 1; i >= 0; i--) {
      const candidate = words.slice(i).join(" ");
      if (candidate.length >= overlapChars || i === 0) {
        carried = candidate;
        break;
      }
    }
    return carried;
  }

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokenCount(paragraph);
    if (paraTokens > maxTokens) {
      if (buffer.trim()) {
        flushBuffer();
        buffer = carryOverlap(buffer);
      }
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let sentenceBuffer = "";
      for (const sentence of sentences) {
        const next = sentenceBuffer ? `${sentenceBuffer} ${sentence}` : sentence;
        if (estimateTokenCount(next) > maxTokens && sentenceBuffer.trim()) {
          chunks.push({
            text: sentenceBuffer.trim(),
            chunkIndex: chunks.length,
            tokenCount: estimateTokenCount(sentenceBuffer),
          });
          sentenceBuffer = carryOverlap(sentenceBuffer) + " " + sentence;
        } else {
          sentenceBuffer = next;
        }
      }
      if (sentenceBuffer.trim()) {
        chunks.push({
          text: sentenceBuffer.trim(),
          chunkIndex: chunks.length,
          tokenCount: estimateTokenCount(sentenceBuffer),
        });
      }
      buffer = "";
      continue;
    }

    const nextBuffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    const nextTokens = estimateTokenCount(nextBuffer);
    if (nextTokens > maxTokens && buffer.trim()) {
      flushBuffer();
      buffer = carryOverlap(buffer) ? `${carryOverlap(buffer)}\n\n${paragraph}` : paragraph;
    } else {
      buffer = nextBuffer;
    }
  }

  if (buffer.trim()) {
    flushBuffer();
  }

  return chunks.map((chunk, index) => ({ ...chunk, chunkIndex: index }));
}

/** Shorter chunks for social posts. */
export function chunkSocialText(text: string): TextChunk[] {
  return chunkText(text, { maxTokens: 200, overlapTokens: 40 });
}

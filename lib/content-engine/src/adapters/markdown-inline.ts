/**
 * Shared inline-markdown helpers.
 *
 * Moved verbatim out of gutenberg.ts so Elementor and Divi don't each grow
 * their own copy — three independent hand-rolled escapers is exactly the kind
 * of duplication that let a bug survive in one of them unnoticed.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inlineToHtml(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

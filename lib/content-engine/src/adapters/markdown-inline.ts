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

/**
 * Matches `[text](url)`. The URL side is naive — it stops at the first `)`,
 * so a URL containing a literal, unencoded parenthesis (rare outside sites
 * like Wikipedia) truncates and leaves a stray `)` after the link. Every URL
 * this product actually generates — image CDN URLs, our own citation links —
 * is plain and never contains one. A real parser (this product already uses
 * `marked` for the classic-editor path) would handle it properly; adding one
 * here is unwarranted for the inputs this ever sees.
 */
const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)\)/g;

/**
 * U+0000 (NUL) brackets a URL's index while it's tokenized. It's a control
 * character no founder or AI provider ever emits in article text, so a
 * tokenized URL can't collide with anything real, and none of escapeHtml or
 * the emphasis passes below touch it — unlike digits alone, which could
 * collide with ordinary text such as "rated 5 stars".
 */
const TOKENIZED_LINK_RE = /\[([^\]]*)\]\(\u0000(\d+)\u0000\)/g;

function applyEmphasis(html: string): string {
  return html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

/**
 * A first attempt at this processed the plain-text segments between links
 * independently, escaping and emphasis-formatting each in isolation. That
 * breaks emphasis spanning a link — `*Photo by [Name](url) on
 * [Unsplash](url)*` has its two `*` markers in different segments, so
 * neither segment alone contains a matched pair and both render as literal
 * asterisks instead of `<em>`.
 *
 * This version keeps the link syntax `[text](...)` present as ordinary text
 * through a single combined escape+emphasis pass over the whole string —
 * only the URL inside the parens is swapped for a safe token first, so it
 * can't be misread as containing emphasis markers. Emphasis spanning a link
 * then works exactly like emphasis spanning any other text, and the final
 * step turns the (now correctly escaped and emphasis-formatted) tokenized
 * links into real anchor tags.
 */
export function inlineToHtml(text: string): string {
  const urls: string[] = [];
  const tokenized = text.replace(LINK_RE, (_match, linkText: string, url: string) => {
    const index = urls.length;
    urls.push(url);
    return `[${linkText}](\u0000${index}\u0000)`;
  });

  const formatted = applyEmphasis(escapeHtml(tokenized));

  return formatted.replace(TOKENIZED_LINK_RE, (_match, linkText: string, i: string) => {
    return `<a href="${escapeHtml(urls[Number(i)]!)}">${linkText}</a>`;
  });
}

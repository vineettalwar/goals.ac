/** Browser-safe HTML sanitizer for CMS render previews (no Node deps). */
const FORBIDDEN_TAGS = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "link",
  "meta",
  "base",
  "style",
]);

const UNSAFE_HREF_SCHEMES = /^(javascript|data|vbscript):/i;

function sanitizeElement(el: Element): void {
  const tag = el.tagName?.toLowerCase();
  if (tag && FORBIDDEN_TAGS.has(tag)) {
    el.remove();
    return;
  }

  for (const attr of [...el.attributes]) {
    const lowerName = attr.name.toLowerCase();
    if (lowerName.startsWith("on") || lowerName === "style") {
      el.removeAttribute(attr.name);
      continue;
    }
    if (
      (lowerName === "href" || lowerName === "src") &&
      UNSAFE_HREF_SCHEMES.test(attr.value)
    ) {
      el.removeAttribute(attr.name);
    }
  }

  for (const child of [...el.children]) {
    sanitizeElement(child);
  }
}

export function sanitizePreviewHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(
    `<div id="sanitize-root">${html}</div>`,
    "text/html",
  );
  const wrapper = doc.getElementById("sanitize-root");
  if (!wrapper) return "";
  sanitizeElement(wrapper);
  return wrapper.innerHTML;
}

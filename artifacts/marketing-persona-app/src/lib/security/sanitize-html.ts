import { parse, type HTMLElement } from "node-html-parser";

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

function sanitizeElement(el: HTMLElement): void {
  const tag = el.tagName?.toLowerCase();
  if (tag && FORBIDDEN_TAGS.has(tag)) {
    el.remove();
    return;
  }

  for (const [name, value] of Object.entries(el.attributes)) {
    const lowerName = name.toLowerCase();
    if (lowerName.startsWith("on") || lowerName === "style") {
      el.removeAttribute(name);
      continue;
    }
    if ((lowerName === "href" || lowerName === "src") && typeof value === "string" && UNSAFE_HREF_SCHEMES.test(value)) {
      el.removeAttribute(name);
    }
  }

  for (const child of [...el.childNodes]) {
    if (child.nodeType === 1) {
      sanitizeElement(child as HTMLElement);
    }
  }
}

export function sanitizeHtml(html: string): string {
  const root = parse(`<div id="sanitize-root">${html}</div>`, { comment: false });
  const wrapper = root.querySelector("#sanitize-root");
  if (!wrapper) return "";
  sanitizeElement(wrapper);
  return wrapper.innerHTML;
}

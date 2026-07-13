export function extractInternalLinks(html: string, baseOrigin: string): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1];
    try {
      const url = href.startsWith("http") ? new URL(href) : new URL(href, baseOrigin);
      if (url.origin === baseOrigin) {
        links.push(url.href);
      }
    } catch {
      // skip invalid
    }
  }
  return [...new Set(links)];
}

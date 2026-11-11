/** Sanitização segura para rich text do builder — sem script/style. */
export function sanitizeRichTextHtml(input: string): string {
  if (!input?.trim()) return "";
  let html = input;
  html = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  html = html.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(/javascript:/gi, "");
  const allowed = new Set([
    "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "blockquote",
    "h2", "h3", "h4", "h5", "h6", "span", "div",
  ]);
  return html.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (match, tag: string) => {
    const t = tag.toLowerCase();
    if (!allowed.has(t)) return "";
    if (match.startsWith("</")) return `</${t}>`;
    if (t === "a") {
      const hrefMatch = match.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "";
      if (/^\s*javascript:/i.test(href)) return "";
      const safeHref = href.startsWith("http") || href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:")
        ? href
        : "#";
      return `<a href="${safeHref}" rel="noopener noreferrer">`;
    }
    return `<${t}>`;
  });
}

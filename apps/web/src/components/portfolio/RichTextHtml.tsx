import { sanitizeRichTextHtml } from "@/lib/sanitize-rich-text";

export function RichTextHtml({
  html,
  className = "mt-4 prose prose-invert max-w-none text-zinc-300",
}: {
  html: string;
  className?: string;
}) {
  const safe = sanitizeRichTextHtml(html);
  if (!safe.trim()) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}

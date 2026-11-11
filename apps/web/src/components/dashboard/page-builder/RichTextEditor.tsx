"use client";

import { useCallback, useRef } from "react";
import { Bold, Italic, Link, List, ListOrdered, Underline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeRichTextHtml } from "@/lib/sanitize-rich-text";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-[120px]",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const exec = useCallback(
    (cmd: string, arg?: string) => {
      document.execCommand(cmd, false, arg);
      const html = ref.current?.innerHTML ?? "";
      onChange(sanitizeRichTextHtml(html));
    },
    [onChange],
  );

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-2">
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => exec("bold")} title="Negrito">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => exec("italic")} title="Itálico">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => exec("underline")} title="Sublinhado">
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => exec("insertUnorderedList")} title="Lista">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-9 w-9" onClick={() => exec("insertOrderedList")} title="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          onClick={() => {
            const url = window.prompt("URL do link");
            if (url) exec("createLink", url);
          }}
          title="Link"
        >
          <Link className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={`rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${minHeightClass}`}
        data-placeholder={placeholder}
        onBlur={() => onChange(sanitizeRichTextHtml(ref.current?.innerHTML ?? ""))}
        dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }}
      />
    </div>
  );
}

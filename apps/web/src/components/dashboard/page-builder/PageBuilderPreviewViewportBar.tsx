"use client";

import { Button } from "@/components/ui/button";
import type { PreviewViewport } from "./usePageEditorSession";
import { Monitor, Smartphone, Tablet } from "lucide-react";

export function PageBuilderPreviewViewportBar({
  viewport,
  onChange,
}: {
  viewport: PreviewViewport;
  onChange: (v: PreviewViewport) => void;
}) {
  const items: { id: PreviewViewport; label: string; Icon: typeof Monitor }[] = [
    { id: "desktop", label: "Desktop", Icon: Monitor },
    { id: "tablet", label: "Tablet", Icon: Tablet },
    { id: "mobile", label: "Mobile", Icon: Smartphone },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Prévia</span>
      {items.map(({ id, label, Icon }) => (
        <Button
          key={id}
          type="button"
          size="sm"
          variant={viewport === id ? "default" : "outline"}
          className="h-9 gap-1.5"
          onClick={() => onChange(id)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}

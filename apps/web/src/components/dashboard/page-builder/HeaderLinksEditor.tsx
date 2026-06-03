"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { HeaderNavLink, HeaderNavSubLink } from "@/lib/header-nav";

interface HeaderLinksEditorProps {
  links: unknown;
  onChange: (links: HeaderNavLink[]) => void;
}

type LinkMode = "simple" | "dropdown";

function asLinks(raw: unknown): HeaderNavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (!item || typeof item !== "object") return { label: "", href: "" };
    const row = item as HeaderNavLink;
    return {
      label: row.label ?? "",
      href: row.href ?? "",
      children: Array.isArray(row.children)
        ? row.children.map((c) => ({
            label: c?.label ?? "",
            href: c?.href ?? "",
          }))
        : undefined,
    };
  });
}

function linkMode(link: HeaderNavLink): LinkMode {
  return (link.children?.length ?? 0) > 0 ? "dropdown" : "simple";
}

export function HeaderLinksEditor({ links, onChange }: HeaderLinksEditorProps) {
  const items = asLinks(links);

  const updateLink = (index: number, patch: Partial<HeaderNavLink>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const setLinkMode = (index: number, mode: LinkMode) => {
    const link = items[index];
    if (!link) return;
    if (mode === "simple") {
      updateLink(index, { children: undefined });
      return;
    }
    const children =
      (link.children?.length ?? 0) > 0 ? link.children : [{ label: "", href: "" }];
    updateLink(index, { children });
  };

  const updateChild = (linkIndex: number, childIndex: number, patch: Partial<HeaderNavSubLink>) => {
    const next = [...items];
    const children = [...(next[linkIndex]?.children ?? [])];
    children[childIndex] = { ...children[childIndex], ...patch };
    next[linkIndex] = { ...next[linkIndex], children };
    onChange(next);
  };

  const addLink = () => {
    onChange([...items, { label: "", href: "" }]);
  };

  const removeLink = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addChild = (linkIndex: number) => {
    const next = [...items];
    const children = [...(next[linkIndex]?.children ?? []), { label: "", href: "" }];
    next[linkIndex] = { ...next[linkIndex], children };
    onChange(next);
  };

  const removeChild = (linkIndex: number, childIndex: number) => {
    const next = [...items];
    const children = (next[linkIndex]?.children ?? []).filter((_, i) => i !== childIndex);
    next[linkIndex] = {
      ...next[linkIndex],
      children: children.length > 0 ? children : [{ label: "", href: "" }],
    };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Links do cabeçalho</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Link simples (texto + URL) ou menu com subitens (dropdown no site). Vale para todos os
          cabeçalhos: grupo, clubes, empresas e eventos.
        </p>
      </div>
      {items.map((link, i) => {
        const mode = linkMode(link);
        const children = link.children ?? [];
        return (
          <div key={i} className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Tipo:</span>
              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5">
                <button
                  type="button"
                  className={cn(
                    "min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    mode === "simple"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setLinkMode(i, "simple")}
                >
                  Link simples
                </button>
                <button
                  type="button"
                  className={cn(
                    "min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    mode === "dropdown"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setLinkMode(i, "dropdown")}
                >
                  Menu com subitens
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Texto do item"
                className="min-w-[140px] flex-1"
                value={link.label ?? ""}
                onChange={(e) => updateLink(i, { label: e.target.value })}
              />
              {mode === "simple" && (
                <Input
                  placeholder="#seção, /url ou https://"
                  className="min-w-[140px] flex-1"
                  value={link.href ?? ""}
                  onChange={(e) => updateLink(i, { href: e.target.value })}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                onClick={() => removeLink(i)}
                aria-label="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {mode === "dropdown" && (
              <div className="space-y-2 border-l-2 border-border pl-3">
                <p className="text-xs text-muted-foreground">
                  Subitens aparecem no dropdown ao clicar no item do cabeçalho.
                </p>
                {children.map((child, j) => (
                  <div key={j} className="flex flex-wrap gap-2">
                    <Input
                      placeholder="Texto do subitem"
                      className="min-w-[120px] flex-1"
                      value={child.label ?? ""}
                      onChange={(e) => updateChild(i, j, { label: e.target.value })}
                    />
                    <Input
                      placeholder="URL (https://…)"
                      className="min-w-[120px] flex-1"
                      value={child.href ?? ""}
                      onChange={(e) => updateChild(i, j, { href: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      onClick={() => removeChild(i, j)}
                      aria-label="Remover subitem"
                      disabled={children.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addChild(i)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar subitem
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={addLink}>
        <Plus className="mr-1 h-4 w-4" />
        Adicionar link
      </Button>
    </div>
  );
}

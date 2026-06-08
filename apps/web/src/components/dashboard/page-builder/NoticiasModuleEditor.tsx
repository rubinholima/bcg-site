"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HomeContentBlock } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import {
  NOTICIAS_COLUMNS_OPTIONS,
  NOTICIAS_MAX_ITEMS_OPTIONS,
  normalizeNoticiasColumns,
  normalizeNoticiasMaxItems,
  noticiasGridRows,
} from "@/lib/noticias-grid";
import { normalizeNoticiasOrderMode } from "@/lib/noticias-order";

interface NoticiasModuleEditorProps {
  block: HomeContentBlock;
  updateBlockConfigValue: (key: string, value: BlockConfigValue) => void;
}

export function NoticiasModuleEditor({
  block,
  updateBlockConfigValue,
}: NoticiasModuleEditorProps) {
  const dataSource = (block.config?.noticiasDataSource as string) ?? "rss";
  const maxItems = normalizeNoticiasMaxItems(block.config?.noticiasMaxItems);
  const columns = normalizeNoticiasColumns(block.config?.noticiasColumns);
  const orderMode = normalizeNoticiasOrderMode(block.config?.noticiasOrderMode);
  const rows = noticiasGridRows(maxItems, columns);

  return (
    <div className="space-y-3 sm:col-span-2">
      <details className="rounded-lg border border-border bg-muted/20">
        <summary className="cursor-pointer px-3 py-2 font-medium">Feed de notícias</summary>
        <div className="space-y-3 border-t border-border px-3 py-3">
          <p className="text-xs text-muted-foreground">
            Use RSS para Google News, Instagram (via RSS.app) ou site do clube. Cole a URL do feed em RSS.
          </p>
          <div className="space-y-2">
            <Label>Fonte</Label>
            <Select
              value={dataSource}
              onValueChange={(v) => updateBlockConfigValue("noticiasDataSource", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rss">RSS (feed externo — Google News, Instagram, site)</SelectItem>
                <SelectItem value="manual">Manual (lista editada)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dataSource !== "manual" && (
            <>
              <div className="space-y-2">
                <Label>URL do feed RSS</Label>
                <Input
                  placeholder="https://rss.app/feeds/... ou https://..."
                  value={(block.config?.noticiasRssUrl as string) ?? ""}
                  onChange={(e) => updateBlockConfigValue("noticiasRssUrl", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Crie em{" "}
                  <a
                    href="https://rss.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    rss.app
                  </a>{" "}
                  — Google News ou Instagram.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Quantidade de cards</Label>
                  <Select
                    value={String(maxItems)}
                    onValueChange={(v) =>
                      updateBlockConfigValue("noticiasMaxItems", normalizeNoticiasMaxItems(Number(v)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTICIAS_MAX_ITEMS_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} cards
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Colunas no grid</Label>
                  <Select
                    value={String(columns)}
                    onValueChange={(v) =>
                      updateBlockConfigValue("noticiasColumns", normalizeNoticiasColumns(Number(v)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTICIAS_COLUMNS_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} coluna{n !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Grade na página:{" "}
                <strong className="text-foreground">
                  {columns} coluna{columns !== 1 ? "s" : ""} × {rows} linha{rows !== 1 ? "s" : ""} = {maxItems}{" "}
                  cards
                </strong>
              </p>
              <div className="space-y-2">
                <Label>Ordem dos cards</Label>
                <Select
                  value={orderMode}
                  onValueChange={(v) => updateBlockConfigValue("noticiasOrderMode", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="destaque_aleatorio">
                      Notícia do dia primeiro + restante aleatório
                    </SelectItem>
                    <SelectItem value="feed">Ordem do feed RSS</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Com aleatório, a notícia mais recente fica em 1º; os demais cards mudam a cada visita.
                </p>
              </div>
            </>
          )}
          {dataSource === "manual" && (
            <div className="space-y-2">
              <Label>Itens manuais</Label>
              <p className="text-xs text-muted-foreground">
                Adicione notícias manualmente (título, link, resumo). Em breve.
              </p>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Espaço no topo</Label>
              <Select
                value={(block.config?.noticiasPaddingTop as string) ?? "compact"}
                onValueChange={(v) => updateBlockConfigValue("noticiasPaddingTop", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Mínimo</SelectItem>
                  <SelectItem value="compact">Compacto</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Espaço embaixo</Label>
              <Select
                value={(block.config?.noticiasPaddingBottom as string) ?? "compact"}
                onValueChange={(v) => updateBlockConfigValue("noticiasPaddingBottom", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Mínimo</SelectItem>
                  <SelectItem value="compact">Compacto</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

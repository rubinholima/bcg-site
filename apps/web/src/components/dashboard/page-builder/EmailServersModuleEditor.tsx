"use client";

import { Mail, Plus, Trash2 } from "lucide-react";
import type { BlockConfigValue } from "@/types/block-config";
import type { EmailServerItem, HomeContentBlock } from "@/types/home-content";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { ModuleTitleGradientFields } from "@/components/dashboard/page-builder/ModuleTitleGradientFields";
import { EMAIL_SERVERS_HUB_PATH } from "@/lib/email-servers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailServersModuleEditorProps {
  block: HomeContentBlock;
  index: number;
  updateBlockConfig: (index: number, key: string, value: string | undefined) => void;
  updateBlockConfigValue: (index: number, key: string, value: BlockConfigValue) => void;
  /** true na Home do Grupo — mostra instrução do link no header */
  isGroupHome?: boolean;
}

export function EmailServersModuleEditor({
  block,
  index,
  updateBlockConfig,
  updateBlockConfigValue,
  isGroupHome = false,
}: EmailServersModuleEditorProps) {
  const items =
    (block.config?.emailServersItems as EmailServerItem[] | undefined) ?? [];

  const setItems = (next: EmailServerItem[]) => {
    updateBlockConfigValue(index, "emailServersItems", next);
  };

  return (
    <div className="space-y-4">
      {isGroupHome ? (
        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-amber-400" />
            <Label className="text-sm font-semibold">Página no site do grupo</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            No <strong>Cabeçalho</strong>, adicione um link apontando para{" "}
            <code className="rounded bg-muted px-1">{EMAIL_SERVERS_HUB_PATH}</code> (ex.: rótulo
            &quot;Email Server&quot;). Só funciona em{" "}
            <strong>bostoncitygroup.biz</strong> — não nos sites dos clubes.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Título (PT)</Label>
          <Input
            value={(block.config?.titlePt as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "titlePt", e.target.value || undefined)}
            placeholder="Servidores de e-mail"
          />
        </div>
        <div className="space-y-2">
          <Label>Título (EN)</Label>
          <Input
            value={(block.config?.titleEn as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "titleEn", e.target.value || undefined)}
            placeholder="Email servers"
          />
        </div>
      </div>

      <ModuleTitleGradientFields
        gradientStart={(block.config?.titleGradientStart as string) ?? ""}
        gradientEnd={(block.config?.titleGradientEnd as string) ?? ""}
        onGradientStart={(v) => updateBlockConfig(index, "titleGradientStart", v || undefined)}
        onGradientEnd={(v) => updateBlockConfig(index, "titleGradientEnd", v || undefined)}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Subtítulo (PT)</Label>
          <Input
            value={(block.config?.bodyPt as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "bodyPt", e.target.value || undefined)}
            placeholder="Escolha a organização para acessar o webmail."
          />
        </div>
        <div className="space-y-2">
          <Label>Subtitle (EN)</Label>
          <Input
            value={(block.config?.bodyEn as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "bodyEn", e.target.value || undefined)}
            placeholder="Choose an organization to open webmail."
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-muted/10 p-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Cor de fundo</Label>
          <Input
            type="text"
            placeholder="#0f0f12"
            value={(block.config?.backgroundColor as string) ?? ""}
            onChange={(e) => updateBlockConfig(index, "backgroundColor", e.target.value || undefined)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Imagem de fundo (opcional)</Label>
          <MediaPicker
            label=""
            sizeKey="card"
            allowAllFolders
            value={(block.config?.backgroundImage as string) ?? ""}
            onChange={(url) => updateBlockConfig(index, "backgroundImage", url || undefined)}
          />
        </div>
        <div className="space-y-2">
          <Label>Opacidade overlay (0–1)</Label>
          <Input
            type="text"
            placeholder="0.75"
            value={String(block.config?.backgroundOverlayOpacity ?? "")}
            onChange={(e) =>
              updateBlockConfig(index, "backgroundOverlayOpacity", e.target.value || undefined)
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Organizações / servidores</Label>
        <p className="text-xs text-muted-foreground">
          Nome e URL de login do webmail (WorkMail, Outlook, etc.) — abre em nova aba.
        </p>
        {items.map((item, ii) => (
          <div
            key={item.id ?? `es-${ii}`}
            className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">URL do servidor *</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={item.url ?? ""}
                onChange={(e) => {
                  const arr = [...items];
                  arr[ii] = { ...arr[ii]!, url: e.target.value };
                  setItems(arr);
                }}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Nome (PT)</Label>
              <Input
                value={item.namePt ?? ""}
                onChange={(e) => {
                  const arr = [...items];
                  arr[ii] = { ...arr[ii]!, namePt: e.target.value };
                  setItems(arr);
                }}
                placeholder="Villa Nova SAF"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Name (EN)</Label>
              <Input
                value={item.nameEn ?? ""}
                onChange={(e) => {
                  const arr = [...items];
                  arr[ii] = { ...arr[ii]!, nameEn: e.target.value };
                  setItems(arr);
                }}
                placeholder="Villa Nova SAF"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Logo (opcional)</Label>
              <MediaPicker
                label=""
                sizeKey="card"
                folder="logos"
                value={item.logoUrl ?? ""}
                onChange={(url) => {
                  const arr = [...items];
                  arr[ii] = { ...arr[ii]!, logoUrl: url };
                  setItems(arr);
                }}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setItems(items.filter((_, j) => j !== ii))}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Remover
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems([
              ...items,
              { id: `es-${Date.now()}`, namePt: "", nameEn: "", url: "", logoUrl: "" },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Adicionar servidor
        </Button>
      </div>
    </div>
  );
}

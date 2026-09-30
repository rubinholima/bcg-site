"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { AccessPermissionEditor, type AccessModuleRow } from "@/components/dashboard/access/AccessPermissionEditor";
import {
  CUP360_PLATFORM_FAMILIES,
  platformFamilyLabel,
} from "@/lib/cup360-platform-families";
import { cn } from "@/lib/utils";

export type PlatformFunctionRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  platformFamily: string | null;
  platformLegacyRole: string | null;
  isActive: boolean;
  moduleDefaults: Array<{ module: { slug: string; name: string; functionalArea: string } }>;
  _count: { platformUsers: number };
};

type Props = {
  functions: PlatformFunctionRow[];
  modules: AccessModuleRow[];
  onReload: () => Promise<void>;
  onFeedback: (title: string, message: string) => void;
  showTechnicalDetails?: boolean;
};

const NEW_ID = "__new__";

function slugifyCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
}

export function FunctionAdminPanel({
  functions,
  modules,
  onReload,
  onFeedback,
  showTechnicalDetails,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [platformFamily, setPlatformFamily] = useState("gestao");
  const [isActive, setIsActive] = useState(true);
  const [defaultSlugs, setDefaultSlugs] = useState<Set<string>>(new Set());
  const [showTech, setShowTech] = useState(false);

  const selected = useMemo(
    () => functions.find((f) => f.id === selectedId) ?? null,
    [functions, selectedId],
  );

  const loadFormFromFunction = useCallback((fn: PlatformFunctionRow) => {
    setName(fn.name);
    setCode(fn.code ?? "");
    setDescription(fn.description ?? "");
    setPlatformFamily(fn.platformFamily ?? "outros");
    setIsActive(fn.isActive);
    setDefaultSlugs(new Set(fn.moduleDefaults.map((d) => d.module.slug)));
  }, []);

  useEffect(() => {
    if (creating) return;
    if (!selectedId || selectedId === NEW_ID) return;
    const fn = functions.find((f) => f.id === selectedId);
    if (fn) loadFormFromFunction(fn);
  }, [selectedId, functions, creating, loadFormFromFunction]);

  const startCreate = () => {
    setCreating(true);
    setSelectedId(NEW_ID);
    setName("");
    setCode("");
    setDescription("");
    setPlatformFamily("gestao");
    setIsActive(true);
    setDefaultSlugs(new Set());
  };

  const cancelCreate = () => {
    setCreating(false);
    setSelectedId("");
  };

  const saveMetadata = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      onFeedback("Atenção", "Informe o nome da função.");
      return;
    }
    setSavingMeta(true);
    try {
      if (creating) {
        const res = await fetch("/api/settings/access/functions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            code: code.trim() || slugifyCode(trimmed) || null,
            description: description.trim() || null,
            platformFamily: platformFamily || null,
          }),
        });
        if (!res.ok) throw new Error("create");
        const created = (await res.json()) as PlatformFunctionRow;
        if (defaultSlugs.size > 0) {
          await fetch(`/api/settings/access/functions/${encodeURIComponent(created.id)}/defaults`, {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ moduleSlugs: [...defaultSlugs] }),
          });
        }
        await onReload();
        setCreating(false);
        setSelectedId(created.id);
        onFeedback("Salvo", "Função criada.");
        return;
      }
      if (!selected) return;
      const res = await fetch(`/api/settings/access/functions/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          code: code.trim() || null,
          description: description.trim() || null,
          platformFamily: platformFamily || null,
          isActive,
        }),
      });
      if (!res.ok) throw new Error("patch");
      await onReload();
      onFeedback("Salvo", "Dados da função atualizados.");
    } catch {
      onFeedback("Erro", "Não foi possível salvar a função.");
    } finally {
      setSavingMeta(false);
    }
  };

  const saveDefaults = async () => {
    const id = creating ? null : selected?.id;
    if (!id) {
      onFeedback("Atenção", "Salve os dados da função antes dos acessos padrão.");
      return;
    }
    setSavingDefaults(true);
    try {
      const res = await fetch(`/api/settings/access/functions/${encodeURIComponent(id)}/defaults`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleSlugs: [...defaultSlugs] }),
      });
      if (!res.ok) throw new Error("defaults");
      await onReload();
      onFeedback("Salvo", "Acessos padrão da função atualizados.");
    } catch {
      onFeedback("Erro", "Não foi possível salvar os acessos padrão.");
    } finally {
      setSavingDefaults(false);
    }
  };

  const functionOptions = useMemo(() => {
    const opts = functions.map((f) => ({
      value: f.id,
      label: `${f.name}${f.isActive ? "" : " (inativa)"} · ${f._count.platformUsers} usuário(s)`,
    }));
    return opts;
  }, [functions]);

  const editorVisible = creating || !!selected;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-sm">Função</Label>
          <NativeSelectField
            className="w-full max-w-none lg:max-w-xl"
            value={creating ? "" : selectedId}
            onChange={(e) => {
              setCreating(false);
              setSelectedId(e.target.value);
            }}
            placeholder="Selecione uma função…"
            options={functionOptions}
            disabled={creating}
          />
        </div>
        <Button type="button" variant="outline" className="min-h-[44px] shrink-0" onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova função
        </Button>
      </div>

      {editorVisible ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
          <div className="space-y-4 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">{creating ? "Nova função" : "Dados da função"}</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="fn-name">Nome</Label>
                <Input
                  id="fn-name"
                  className="mt-1 text-foreground"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fn-code">Código</Label>
                <Input
                  id="fn-code"
                  className="mt-1 text-foreground"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={slugifyCode(name) || "CODIGO_ESTAVEL"}
                />
              </div>
              <div>
                <Label htmlFor="fn-family">Família / departamento</Label>
                <NativeSelect
                  id="fn-family"
                  className="mt-1 w-full"
                  value={platformFamily}
                  onChange={(e) => setPlatformFamily(e.target.value)}
                >
                  {CUP360_PLATFORM_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <Label htmlFor="fn-desc">Descrição</Label>
                <textarea
                  id="fn-desc"
                  rows={3}
                  className={cn(
                    "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
                  )}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              {!creating ? (
                <label className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  Função ativa
                </label>
              ) : null}
              {showTechnicalDetails && selected?.platformLegacyRole ? (
                <div className="border-t border-border pt-3">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    onClick={() => setShowTech((v) => !v)}
                  >
                    {showTech ? "Ocultar detalhes técnicos" : "Detalhes técnicos"}
                  </button>
                  {showTech ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Perfil legado vinculado: {selected.platformLegacyRole}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {creating ? (
                <Button type="button" variant="ghost" onClick={cancelCreate}>
                  Cancelar
                </Button>
              ) : null}
              <Button type="button" className="min-h-[44px]" disabled={savingMeta} onClick={saveMetadata}>
                {savingMeta ? "Salvando…" : creating ? "Criar função" : "Salvar dados"}
              </Button>
            </div>
            {!creating && selected ? (
              <p className="text-xs text-muted-foreground">
                Família: {platformFamilyLabel(selected.platformFamily)} · Padrão: {selected.moduleDefaults.length}{" "}
                área(s)
              </p>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3">
            <p className="text-sm font-medium">Acessos padrão da função</p>
            <AccessPermissionEditor
              variant="function"
              modules={modules}
              inherited={new Set()}
              allow={defaultSlugs}
              deny={new Set()}
              onToggleAllow={(slug, on) => {
                setDefaultSlugs((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(slug);
                  else next.delete(slug);
                  return next;
                });
              }}
              onToggleDeny={() => {}}
            />
            {creating ? (
              <p className="text-xs text-muted-foreground">
                Use &quot;Criar função&quot; ao lado — os acessos marcados entram no padrão inicial.
              </p>
            ) : (
              <Button
                type="button"
                className="min-h-[44px] w-full sm:w-auto"
                disabled={savingDefaults}
                onClick={() => void saveDefaults()}
              >
                {savingDefaults ? "Salvando…" : "Salvar acessos padrão"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Selecione uma função ou crie uma nova.</p>
      )}
    </div>
  );
}

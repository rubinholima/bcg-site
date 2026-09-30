"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";
import { cn } from "@/lib/utils";

export type AccessModuleRow = {
  slug: string;
  name: string;
  functionalArea: string;
};

type Props = {
  modules: AccessModuleRow[];
  inherited: Set<string>;
  allow: Set<string>;
  deny: Set<string>;
  onToggleAllow: (slug: string, on: boolean) => void;
  onToggleDeny: (slug: string, on: boolean) => void;
  readOnly?: boolean;
  /** user = herança + liberar/negar; function = só padrão da função */
  variant?: "user" | "function";
};

function label(slug: string, name: string) {
  return MODULE_DISPLAY_NAMES[slug] ?? name ?? slug;
}

export function AccessPermissionEditor({
  modules,
  inherited,
  allow,
  deny,
  onToggleAllow,
  onToggleDeny,
  readOnly,
  variant = "user",
}: Props) {
  const isFunction = variant === "function";
  const [q, setQ] = useState("");
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const map = new Map<string, AccessModuleRow[]>();
    for (const m of modules) {
      const text = `${label(m.slug, m.name)} ${m.functionalArea}`.toLowerCase();
      if (query && !text.includes(query)) continue;
      const area = m.functionalArea || "outros";
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [modules, q]);

  const effective = (slug: string) => {
    if (isFunction) return allow.has(slug) ? "allow" : "none";
    if (deny.has(slug)) return "deny";
    if (allow.has(slug)) return "allow";
    if (inherited.has(slug)) return "inherit";
    return "none";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 text-foreground"
            placeholder="Buscar área…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {isFunction ? (
            <>
              <li>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Incluído no padrão
              </li>
              <li>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-800" />
                Fora do padrão
              </li>
            </>
          ) : (
            <>
              <li>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-500" />
                Herdado
              </li>
              <li>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Liberação extra
              </li>
              <li>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />
                Bloqueio
              </li>
              <li>
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-zinc-800" />
                Sem acesso
              </li>
            </>
          )}
        </ul>
      </div>

      <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
        {grouped.map(([area, rows]) => {
          const isOpen = openAreas[area] !== false;
          return (
            <div key={area} className="rounded-lg border border-border">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium"
                onClick={() => setOpenAreas((p) => ({ ...p, [area]: !isOpen }))}
              >
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <span className="uppercase tracking-wide text-muted-foreground">{area}</span>
                <span className="text-xs text-muted-foreground">({rows.length})</span>
              </button>
              {isOpen ? (
                <ul className="border-t border-border px-2 pb-2">
                  {rows.map((m) => {
                    const state = effective(m.slug);
                    return (
                      <li
                        key={m.slug}
                        className="flex flex-col gap-2 border-b border-border/50 py-2 last:border-0 sm:flex-row sm:items-center"
                      >
                        <span
                          className={cn(
                            "min-w-0 flex-1 text-sm",
                            state === "deny" && "text-red-400 line-through",
                            state === "allow" && "text-emerald-400",
                            state === "inherit" && "text-foreground",
                            state === "none" && "text-muted-foreground",
                          )}
                        >
                          {label(m.slug, m.name)}
                        </span>
                        {!readOnly ? (
                          <div className="flex shrink-0 gap-4 text-xs">
                            <label className="flex min-h-[44px] items-center gap-1.5 sm:min-h-0">
                              <input
                                type="checkbox"
                                checked={allow.has(m.slug)}
                                onChange={(e) => onToggleAllow(m.slug, e.target.checked)}
                              />
                              {isFunction ? "Padrão" : "Liberar"}
                            </label>
                            {!isFunction ? (
                              <label className="flex min-h-[44px] items-center gap-1.5 sm:min-h-0">
                                <input
                                  type="checkbox"
                                  checked={deny.has(m.slug)}
                                  onChange={(e) => onToggleDeny(m.slug, e.target.checked)}
                                />
                                Negar
                              </label>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";

export type GroupedFieldOption = {
  key: string;
  label: string;
  group: string;
};

type GroupedFieldPickerProps = {
  options: GroupedFieldOption[];
  groupLabels?: Record<string, string>;
  selected: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
  minSelected?: number;
  searchPlaceholder?: string;
};

export function GroupedFieldPicker({
  options,
  groupLabels = {},
  selected,
  onChange,
  disabled = false,
  minSelected = 1,
  searchPlaceholder = "Buscar coluna…",
}: GroupedFieldPickerProps) {
  const [query, setQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (groupLabels[o.group] ?? o.group).toLowerCase().includes(q),
    );
  }, [options, query, groupLabels]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedFieldOption[]>();
    for (const opt of filtered) {
      const g = opt.group || "outros";
      map.set(g, [...(map.get(g) ?? []), opt]);
    }
    return map;
  }, [filtered]);

  const toggle = (key: string) => {
    if (disabled) return;
    const checked = selected.includes(key);
    if (checked) {
      if (selected.length <= minSelected) return;
      onChange(selected.filter((k) => k !== key));
      return;
    }
    onChange([...selected, key]);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const isGroupCollapsed = (groupKey: string) => {
    if (collapsedGroups[groupKey] !== undefined) return collapsedGroups[groupKey];
    const groupOpts = grouped.get(groupKey) ?? [];
    const hasSelected = groupOpts.some((o) => selected.includes(o.key));
    return !hasSelected && !query.trim();
  };

  const selectAllInGroup = (groupKey: string) => {
    const keys = (grouped.get(groupKey) ?? []).map((o) => o.key);
    const merged = new Set([...selected, ...keys]);
    onChange([...merged]);
  };

  const clearGroup = (groupKey: string) => {
    const keys = new Set((grouped.get(groupKey) ?? []).map((o) => o.key));
    const next = selected.filter((k) => !keys.has(k));
    if (next.length >= minSelected) onChange(next);
  };

  return (
    <div className={cn(cup360.surface2, "space-y-3 p-3 sm:p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled}
            className="h-9 pl-8 text-foreground"
          />
        </div>
        <span className={cup360.type.caption}>
          {selected.length} selecionada{selected.length === 1 ? "" : "s"}
        </span>
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((key) => {
            const opt = options.find((o) => o.key === key);
            const isLast = selected.length <= minSelected;
            return (
              <button
                key={key}
                type="button"
                disabled={disabled || isLast}
                onClick={() => toggle(key)}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium",
                  cup360.accentBorder,
                  cup360.accentBg,
                  "text-foreground disabled:opacity-60",
                )}
              >
                <span className="truncate">{opt?.label ?? key}</span>
                {!isLast ? <X className="h-3 w-3 shrink-0 opacity-70" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
        {[...grouped.entries()].map(([groupKey, fields]) => {
          const label = groupLabels[groupKey] ?? groupKey;
          const collapsed = isGroupCollapsed(groupKey);
          const selectedInGroup = fields.filter((f) => selected.includes(f.key)).length;

          return (
            <div key={groupKey} className="rounded-lg border border-border/50 bg-background/60">
              <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupKey)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                  disabled={disabled}
                >
                  {collapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className={cup360.type.sectionTitle}>{label}</span>
                  <span className={cup360.type.caption}>
                    ({selectedInGroup}/{fields.length})
                  </span>
                </button>
                {!disabled ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => selectAllInGroup(groupKey)}
                    >
                      Todas
                    </Button>
                    {selectedInGroup > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => clearGroup(groupKey)}
                      >
                        Limpar
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {!collapsed ? (
                <ul className="divide-y divide-border/30">
                  {fields.map((field) => {
                    const checked = selected.includes(field.key);
                    const isLast = checked && selected.length <= minSelected;
                    return (
                      <li key={field.key}>
                        <button
                          type="button"
                          disabled={disabled || isLast}
                          onClick={() => toggle(field.key)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                            checked
                              ? "bg-violet-500/10 font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                            (disabled || isLast) && checked && "cursor-default",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                              checked
                                ? "border-violet-500 bg-violet-500 text-white"
                                : "border-border bg-background",
                            )}
                            aria-hidden
                          >
                            {checked ? "✓" : ""}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{field.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
        {grouped.size === 0 ? (
          <p className={cn(cup360.type.caption, "py-4 text-center")}>
            Nenhuma coluna encontrada.
          </p>
        ) : null}
      </div>
    </div>
  );
}

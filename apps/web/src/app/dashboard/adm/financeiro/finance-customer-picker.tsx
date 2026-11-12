"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type FinanceCustomerOption = {
  id: string;
  name: string;
};

export function FinanceCustomerPicker({
  tenantId,
  value,
  onChange,
  disabled,
}: {
  tenantId: string;
  value: FinanceCustomerOption | null;
  onChange: (v: FinanceCustomerOption | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FinanceCustomerOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const t = window.setTimeout(() => {
      const q = query.trim();
      void api
        .get<FinanceCustomerOption[]>(
          `/financeiro/customers?tenantId=${encodeURIComponent(tenantId)}${q ? `&search=${encodeURIComponent(q)}` : ""}`,
        )
        .then(({ data }) => setOptions(Array.isArray(data) ? data : []))
        .catch(() => setOptions([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [tenantId, query]);

  return (
    <div className="space-y-1">
      <Label>Cliente / pagador</Label>
      {value ? (
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
          <span className="text-foreground">{value.name}</span>
          <button
            type="button"
            className="text-xs text-primary underline-offset-2 hover:underline"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Trocar
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            className="text-foreground"
            placeholder="Buscar cliente…"
            value={query}
            disabled={disabled}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
          />
          {open && options.length > 0 ? (
            <ul
              className={cn(
                "absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md",
              )}
            >
              {options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {opt.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

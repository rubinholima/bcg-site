"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type FinanceEmployeeOption = {
  employeeId: string;
  employmentId: string | null;
  name: string;
  code: string | null;
};

export function FinanceEmployeePicker({
  tenantId,
  value,
  onChange,
  disabled,
}: {
  tenantId: string;
  value: FinanceEmployeeOption | null;
  onChange: (v: FinanceEmployeeOption | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<FinanceEmployeeOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const t = window.setTimeout(() => {
      void api
        .get<FinanceEmployeeOption[]>(
          `/financeiro/colaboradores?tenantId=${encodeURIComponent(tenantId)}&q=${encodeURIComponent(query.trim())}`,
        )
        .then(({ data }) => setOptions(Array.isArray(data) ? data : []))
        .catch(() => setOptions([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [tenantId, query]);

  return (
    <div className="space-y-1">
      <Label>Colaborador (pagador)</Label>
      {value ? (
        <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
          <span className="text-foreground">
            {value.name}
            {value.code ? <span className="text-muted-foreground ml-2">{value.code}</span> : null}
          </span>
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
            placeholder="Buscar por nome, código ou CPF…"
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
              {options.map((o) => (
                <li key={o.employeeId}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/80"
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {o.name}
                    {o.code ? <span className="text-muted-foreground ml-2">{o.code}</span> : null}
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

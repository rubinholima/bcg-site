"use client";

import { NativeSelectField } from "@/components/ui/native-select";
import {
  bchOperationalEventOptions,
  type BchEventListLike,
} from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { cn } from "@/lib/utils";

export function BchEventSelectField<T extends BchEventListLike>({
  events,
  value,
  onChange,
  placeholder = "Selecione o evento…",
  className,
  includeSmokeTests,
  allowAll,
  allLabel = "Todos os eventos",
  id,
  label,
}: {
  events: T[];
  value: string;
  onChange: (eventId: string) => void;
  placeholder?: string;
  className?: string;
  includeSmokeTests?: boolean;
  allowAll?: boolean;
  allLabel?: string;
  id?: string;
  label?: string;
}) {
  const options = bchOperationalEventOptions(events, { includeSmokeTests });
  const withAll = allowAll ? [{ value: "", label: allLabel }, ...options] : options;
  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium leading-none text-slate-200">
          {label}
        </label>
      ) : null}
    <NativeSelectField
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      options={withAll}
      className="w-full sm:max-w-md"
    />
    </div>
  );
}

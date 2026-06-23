"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FOOTBALL_POSITIONS, getPositionLabel } from "@/lib/football-positions";
import { cn } from "@/lib/utils";

type FootballPositionSelectProps = {
  value?: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Valor enviado ao limpar (ex.: "" ou "none"). */
  emptyValue?: string;
  emptyLabel?: string;
  showEmptyOption?: boolean;
  triggerClassName?: string;
};

export function FootballPositionSelect({
  value,
  onValueChange,
  placeholder = "Selecione",
  emptyValue = "",
  emptyLabel = "—",
  showEmptyOption = false,
  triggerClassName,
}: FootballPositionSelectProps) {
  const resolvedValue = value?.trim() ? value : showEmptyOption ? emptyValue : "";
  const displayLabel = value?.trim() ? getPositionLabel(value) : undefined;

  return (
    <Select
      value={resolvedValue}
      onValueChange={(v) => {
        if (showEmptyOption && v === emptyValue) onValueChange("");
        else onValueChange(v);
      }}
    >
      <SelectTrigger className={cn(triggerClassName)}>
        <SelectValue placeholder={placeholder}>{displayLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showEmptyOption ? (
          <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>
        ) : null}
        {FOOTBALL_POSITIONS.map((pos) => (
          <SelectItem key={pos.value} value={pos.value}>
            {pos.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { cn } from "@/lib/utils";

export const modalNativeSelectClassName =
  "flex min-h-[44px] w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export interface ModalNativeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ModalNativeSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ModalNativeSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Select nativo — Radix Select (Portal) não abre dentro de `<dialog showModal>`. */
export function ModalNativeSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Selecione…",
  disabled,
  className,
}: ModalNativeSelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(modalNativeSelectClassName, className)}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

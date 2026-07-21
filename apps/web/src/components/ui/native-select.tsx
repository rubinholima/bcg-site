"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Classes do select nativo — use em Dialog/AlertDialog (Radix Select quebra no modal). */
export const nativeSelectClassName = (className?: string) =>
  cn(
    "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "w-full min-w-0 min-h-[44px]",
    className,
  );

/** @deprecated use nativeSelectClassName — mantido para imports antigos */
export const NATIVE_SELECT_CLASS = nativeSelectClassName();

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Select HTML nativo — padrão do projeto dentro de Dialog/AlertDialog.
 * Fora de modal, Radix Select (`@/components/ui/select`) continua ok.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={nativeSelectClassName(className)} {...props}>
      {children}
    </select>
  ),
);
NativeSelect.displayName = "NativeSelect";

export interface NativeSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type NativeSelectFieldProps = NativeSelectProps & {
  options: NativeSelectOption[];
  placeholder?: string;
  placeholderValue?: string;
};

/** Select nativo com lista de opções — atalho para formulários em modal. */
export function NativeSelectField({
  options,
  placeholder,
  placeholderValue = "",
  className,
  ...props
}: NativeSelectFieldProps) {
  return (
    <NativeSelect className={className} {...props}>
      {placeholder ? (
        <option value={placeholderValue} disabled={props.required}>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </NativeSelect>
  );
}

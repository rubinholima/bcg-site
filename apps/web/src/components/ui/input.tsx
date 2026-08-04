import * as React from "react";

import { cn } from "@/lib/utils";
import {
  formatDateDayMonYear,
  formatDateTimeDayMonYear,
} from "@/lib/format-date";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, value, defaultValue, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (type === "email") {
        const lower = e.target.value.toLowerCase();
        if (lower !== e.target.value) {
          e.target.value = lower;
        }
      }
      onChange?.(e);
    };

    const baseClass = cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      type === "email" && "lowercase",
    );

    if (type === "date" || type === "datetime-local") {
      const raw =
        typeof value === "string"
          ? value
          : typeof defaultValue === "string"
            ? defaultValue
            : "";
      const label =
        type === "datetime-local"
          ? raw
            ? formatDateTimeDayMonYear(raw)
            : ""
          : raw
            ? formatDateDayMonYear(raw)
            : "";

      return (
        <div className={cn("relative w-full", className)}>
          <input
            type={type}
            className={cn(
              baseClass,
              "text-transparent caret-transparent",
              "[&::-webkit-datetime-edit]:text-transparent",
              "[&::-webkit-datetime-edit-fields-wrapper]:text-transparent",
              "[&::-webkit-datetime-edit-text]:text-transparent",
              "[&::-webkit-datetime-edit-month-field]:text-transparent",
              "[&::-webkit-datetime-edit-day-field]:text-transparent",
              "[&::-webkit-datetime-edit-year-field]:text-transparent",
              "[&::-webkit-datetime-edit-hour-field]:text-transparent",
              "[&::-webkit-datetime-edit-minute-field]:text-transparent",
              "[&::-webkit-datetime-edit-ampm-field]:text-transparent",
              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
              "[&::-webkit-calendar-picker-indicator]:opacity-100",
            )}
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            {...props}
            onChange={handleChange}
          />
          <span
            className={cn(
              "pointer-events-none absolute inset-y-0 left-3 right-10 flex items-center text-sm",
              label ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label || "—"}
          </span>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(baseClass, className)}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        {...props}
        onChange={handleChange}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

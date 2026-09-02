"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";

type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "accent";
  className?: string;
  children?: React.ReactNode;
};

const toneClasses = {
  default: "",
  success: "border-emerald-500/25",
  warning: "border-amber-500/30",
  danger: "border-red-500/30",
  info: "border-sky-500/25",
  accent: cup360.accentBorder,
} as const;

const iconToneClasses = {
  default: "text-muted-foreground",
  success: cup360.success,
  warning: cup360.warning,
  danger: cup360.danger,
  info: cup360.info,
  accent: cup360.accent,
} as const;

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
  children,
}: KpiCardProps) {
  return (
    <div className={cn(cup360.kpi.card, toneClasses[tone], className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className={cup360.kpi.label}>{label}</p>
          <p className={cup360.kpi.value}>{value}</p>
          {hint ? <div className={cup360.type.caption}>{hint}</div> : null}
        </div>
        {Icon ? (
          <Icon className={cn("h-5 w-5 shrink-0", iconToneClasses[tone])} aria-hidden />
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

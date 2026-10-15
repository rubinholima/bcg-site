"use client";

import { BchPageShell } from "@/components/dashboard/boston-city-hall/BchPageShell";

/** @deprecated Prefer BchPageShell — mantido para workspace de evento. */
export function BchWorkspaceContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <BchPageShell className={className}>{children}</BchPageShell>;
}

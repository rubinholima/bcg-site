"use client";

import { cn } from "@/lib/utils";
import { BCH_WORKSPACE_CONTENT } from "@/components/dashboard/boston-city-hall/bch-ui-classes";

export function BchWorkspaceContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(BCH_WORKSPACE_CONTENT, className)}>{children}</div>;
}

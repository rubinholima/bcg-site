"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BostonTvCollapsibleSectionProps {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function BostonTvCollapsibleSection({
  title,
  description,
  open,
  onOpenChange,
  actions,
  className,
  children,
}: BostonTvCollapsibleSectionProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {open ? "Recolher" : "Expandir"}
          </Button>
        </div>
      </CardHeader>
      {open ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

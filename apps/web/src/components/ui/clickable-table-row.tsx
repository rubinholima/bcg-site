"use client";

import type { MouseEvent, KeyboardEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ClickableTableRowProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function ClickableTableRow({ href, onClick, children, className }: ClickableTableRowProps) {
  const router = useRouter();
  const interactive = Boolean(href || onClick);

  const handleActivate = () => {
    if (href) {
      router.push(href);
      return;
    }
    onClick?.();
  };

  const handleClick = (event: MouseEvent<HTMLTableRowElement>) => {
    if (!interactive) return;
    if (event.defaultPrevented) return;
    handleActivate();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!interactive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <TableRow
      className={cn(interactive && "cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "link" : undefined}
    >
      {children}
    </TableRow>
  );
}

interface TableRowActionsProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function TableRowActions({ children, className, align = "right" }: TableRowActionsProps) {
  return (
    <TableCell
      className={cn(align === "right" ? "text-right" : "text-left", className)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </TableCell>
  );
}

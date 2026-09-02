"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";

export type TopShortcutIconProps = {
  menuLogoSrc?: string;
  icon?: LucideIcon;
  className?: string;
};

export function TopShortcutIcon({
  menuLogoSrc,
  icon: Icon,
  className = cup360.control.iconSm,
}: TopShortcutIconProps) {
  if (menuLogoSrc) {
    return (
      <img
        src={menuLogoSrc}
        alt=""
        className={cn("rounded-full object-contain", className)}
      />
    );
  }
  if (!Icon) return null;
  return <Icon className={cn(cup360.shortcut.icon, className)} />;
}

type TopShortcutLinkProps = {
  href: string;
  label: string;
  displayLabel: string;
  menuLogoSrc?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
};

export function TopShortcutLink({
  href,
  label,
  displayLabel,
  menuLogoSrc,
  icon,
  isActive,
  onContextMenu,
}: TopShortcutLinkProps) {
  return (
    <Link
      href={href}
      title={label}
      onContextMenu={onContextMenu}
      className={cn(
        cup360.shortcut.base,
        cup360.shortcut.filled,
        isActive && "ring-1 ring-violet-400/50 dark:ring-violet-500/40",
      )}
    >
      <TopShortcutIcon menuLogoSrc={menuLogoSrc} icon={icon} />
      <span className={cup360.shortcut.label}>{displayLabel}</span>
    </Link>
  );
}

type TopShortcutEmptyProps = {
  onClick: () => void;
};

export function TopShortcutEmpty({ onClick }: TopShortcutEmptyProps) {
  return (
    <button
      type="button"
      title="Adicionar atalho"
      onClick={onClick}
      className={cn(
        cup360.shortcut.base,
        "justify-center transition-colors",
        cup360.shortcut.empty,
      )}
    >
      <Plus className={cn(cup360.control.iconSm, "shrink-0")} />
      <span className={cup360.shortcut.label}>Atalho</span>
    </button>
  );
}

type TopShortcutBarProps = {
  children: React.ReactNode;
  className?: string;
};

export function TopShortcutBar({ children, className }: TopShortcutBarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-end gap-1.5 overflow-x-auto overscroll-x-contain md:justify-center md:gap-2",
        className,
      )}
      aria-label="Meus atalhos"
    >
      {children}
    </div>
  );
}

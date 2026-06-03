"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  filterVisibleHeaderNavLinks,
  getValidHeaderSubLinks,
  isExternalHeaderHref,
  isHeaderNavDropdown,
  parseHeaderNavLinks,
  type HeaderNavLink,
} from "@/lib/header-nav";

interface HeaderNavMenuProps {
  links: unknown;
  linkClassName?: string;
  style?: React.CSSProperties;
  /** Classes no wrapper de cada item (ex.: hidden sm:inline-block na home). */
  itemWrapperClassName?: string;
}

function HeaderNavAnchor({
  href,
  label,
  className,
  style,
}: {
  href: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (isExternalHeaderHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {label}
    </Link>
  );
}

function HeaderNavDropdownItem({
  link,
  linkClassName,
  style,
  itemWrapperClassName,
}: {
  link: HeaderNavLink;
  linkClassName?: string;
  style?: React.CSSProperties;
  itemWrapperClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = (link.label ?? "").trim();
  const children = getValidHeaderSubLinks(link);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div
      ref={ref}
      className={cn("group relative", itemWrapperClassName)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(linkClassName, "inline-flex items-center gap-1")}
        style={style}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "absolute right-0 top-full z-50 min-w-[12rem] pt-1 transition-all duration-150",
          open ? "visible opacity-100" : "invisible opacity-0",
          "group-hover:visible group-hover:opacity-100",
        )}
        role="menu"
      >
        <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
          {children.map((child, i) => (
            <div key={`${child.href}-${i}`} role="none">
              {isExternalHeaderHref(child.href) ? (
                <a
                  href={child.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  className="flex min-h-[44px] items-center px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  style={style}
                  onClick={() => setOpen(false)}
                >
                  {child.label}
                </a>
              ) : (
                <Link
                  href={child.href}
                  role="menuitem"
                  className="flex min-h-[44px] items-center px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  style={style}
                  onClick={() => setOpen(false)}
                >
                  {child.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeaderNavMenu({
  links,
  linkClassName = "rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white",
  style,
  itemWrapperClassName,
}: HeaderNavMenuProps) {
  const visible = filterVisibleHeaderNavLinks(parseHeaderNavLinks(links));

  return (
    <>
      {visible.map((link, i) => {
        const label = (link.label ?? "").trim();
        if (isHeaderNavDropdown(link)) {
          return (
            <HeaderNavDropdownItem
              key={`${label}-${i}`}
              link={link}
              linkClassName={linkClassName}
              style={style}
              itemWrapperClassName={itemWrapperClassName}
            />
          );
        }
        const href = (link.href ?? "").trim();
        return (
          <span key={`${label}-${i}`} className={itemWrapperClassName}>
            <HeaderNavAnchor href={href} label={label} className={linkClassName} style={style} />
          </span>
        );
      })}
    </>
  );
}

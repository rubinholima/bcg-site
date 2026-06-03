export interface HeaderNavSubLink {
  label?: string;
  href?: string;
}

export interface HeaderNavLink {
  label?: string;
  href?: string;
  children?: HeaderNavSubLink[];
}

export function parseHeaderNavLinks(raw: unknown): HeaderNavLink[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (!item || typeof item !== "object") return { label: "", href: "" };
    const row = item as Record<string, unknown>;
    const children = Array.isArray(row.children)
      ? row.children.map((child) => {
          if (!child || typeof child !== "object") return { label: "", href: "" };
          const sub = child as Record<string, unknown>;
          return {
            label: String(sub.label ?? ""),
            href: String(sub.href ?? ""),
          };
        })
      : undefined;
    return {
      label: String(row.label ?? ""),
      href: String(row.href ?? ""),
      ...(children ? { children } : {}),
    };
  });
}

export function getValidHeaderSubLinks(
  link: HeaderNavLink,
): Array<{ label: string; href: string }> {
  return (link.children ?? [])
    .map((c) => ({ label: (c.label ?? "").trim(), href: (c.href ?? "").trim() }))
    .filter((c) => c.label && c.href);
}

export function isHeaderNavDropdown(link: HeaderNavLink): boolean {
  return getValidHeaderSubLinks(link).length > 0;
}

/** Item visível no menu: label + (href ou subitens válidos). */
export function filterVisibleHeaderNavLinks(links: HeaderNavLink[]): HeaderNavLink[] {
  return links.filter((link) => {
    const label = (link.label ?? "").trim();
    if (!label) return false;
    if (isHeaderNavDropdown(link)) return true;
    return !!(link.href ?? "").trim();
  });
}

export function isExternalHeaderHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

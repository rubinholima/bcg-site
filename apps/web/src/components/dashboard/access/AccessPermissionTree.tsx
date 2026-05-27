"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACCESS_GROUP_LABELS,
  collectTreeAccessSlugs,
  type MenuAccessTreeNode,
} from "@/lib/dashboard-menu.config";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";

function uniqueSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)];
}

function nodeMatchesSearch(node: MenuAccessTreeNode, q: string): boolean {
  if (!q) return true;
  const hay = `${node.label} ${node.accessSlug ?? ""} ${node.moduleSlug ?? ""} ${node.href ?? ""}`.toLowerCase();
  if (hay.includes(q)) return true;
  return node.children.some((c) => nodeMatchesSearch(c, q));
}

function filterTree(nodes: MenuAccessTreeNode[], q: string): MenuAccessTreeNode[] {
  if (!q) return nodes;
  const out: MenuAccessTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "leaf") {
      if (nodeMatchesSearch(node, q)) out.push(node);
    } else {
      const children = filterTree(node.children, q);
      if (children.length > 0 || node.label.toLowerCase().includes(q)) {
        out.push({ ...node, children: children.length > 0 ? children : node.children });
      }
    }
  }
  return out;
}

interface AccessPermissionTreeProps {
  tree: MenuAccessTreeNode[];
  isEnabled: (accessSlug: string) => boolean;
  onToggleAccess: (
    accessSlug: string,
    value: boolean,
    opts?: { moduleSlug?: string; accessGroup?: string },
  ) => void;
  search?: string;
  readOnly?: boolean;
}

function AccessTreeNodeRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  isEnabled,
  onToggleAccess,
  readOnly,
  searchActive,
}: {
  node: MenuAccessTreeNode;
  depth: number;
  expanded: boolean;
  onToggleExpand: () => void;
  isEnabled: (accessSlug: string) => boolean;
  onToggleAccess: (
    accessSlug: string,
    value: boolean,
    opts?: { moduleSlug?: string; accessGroup?: string },
  ) => void;
  readOnly?: boolean;
  searchActive: boolean;
}) {
  const isDepartment = depth === 0;
  const isSubSection = depth === 1 && node.kind === "group";
  const leafSlugs = uniqueSlugs(collectTreeAccessSlugs(node));
  const enabledCount = leafSlugs.filter((s) => isEnabled(s)).length;

  if (node.kind === "leaf" && node.accessSlug) {
    const on = isEnabled(node.accessSlug);
    const modLabel = node.moduleSlug ? (MODULE_DISPLAY_NAMES[node.moduleSlug] ?? node.moduleSlug) : null;
    const groupLabel =
      node.accessGroup && ACCESS_GROUP_LABELS[node.accessGroup]
        ? ACCESS_GROUP_LABELS[node.accessGroup]
        : null;
    return (
      <label
        className={cn(
          "flex items-start gap-3 py-2.5 px-3 sm:px-4 cursor-pointer hover:bg-muted/25",
          isSubSection && "bg-muted/5",
          readOnly && "cursor-default opacity-90",
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="w-5 shrink-0" aria-hidden />
        <input
          type="checkbox"
          checked={on}
          disabled={readOnly}
          onChange={(e) =>
            onToggleAccess(node.accessSlug!, e.target.checked, {
              moduleSlug: node.moduleSlug,
              accessGroup: node.accessGroup,
            })
          }
          className="h-5 w-5 mt-0.5 rounded-md border-input accent-primary cursor-pointer shrink-0 disabled:cursor-not-allowed"
          aria-label={node.label}
        />
        <span className="min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground block">{node.label}</span>
          {groupLabel ? (
            <span className="text-xs text-muted-foreground block mt-0.5">
              Grupo: {groupLabel} (libera/bloqueia junto)
            </span>
          ) : modLabel && modLabel !== node.label ? (
            <span className="text-xs text-muted-foreground block mt-0.5">API: {modLabel}</span>
          ) : null}
        </span>
      </label>
    );
  }

  const hasChildren = node.children.length > 0;
  const isOpen = searchActive || expanded;

  return (
    <div
      className={cn(
        isDepartment &&
          "rounded-xl border-2 border-border overflow-hidden shadow-sm border-l-[6px] border-l-primary bg-card",
        isSubSection && "border-l-[3px] border-l-primary/45 bg-muted/10",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 py-3 sm:px-4",
          isDepartment && "border-b-2 border-primary/35 bg-muted/45 py-3.5 sm:py-4",
          isSubSection && "border-b border-border/70 bg-muted/20",
          depth > 1 && !isSubSection && "border-t border-border/50",
        )}
        style={{ paddingLeft: depth > 0 && !isDepartment ? `${12 + (depth - 1) * 16}px` : undefined }}
      >
        <div className="flex min-w-0 items-center gap-2 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className={cn(
                "shrink-0 rounded-md p-1 hover:bg-muted/50 text-muted-foreground",
                isDepartment && "text-foreground",
              )}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Recolher" : "Expandir"}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}
          <div className="min-w-0">
            {isDepartment ? (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/90 mb-0.5">
                Departamento
              </p>
            ) : null}
            <h3
              className={cn(
                "font-semibold text-foreground",
                isDepartment && "text-base sm:text-lg tracking-tight",
                isSubSection && "text-sm text-foreground/95",
                !isDepartment && !isSubSection && depth > 0 && "text-sm",
              )}
            >
              {node.label}
            </h3>
            {leafSlugs.length > 0 ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {enabledCount}/{leafSlugs.length} itens liberados — marque cada linha abaixo
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {hasChildren && isOpen ? (
        <div
          className={cn(
            isDepartment && "divide-y divide-border/50",
            isSubSection && "border-t border-border/40 divide-y divide-border/30",
          )}
        >
          {node.children.map((child) => (
            <AccessTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isEnabled={isEnabled}
              onToggleAccess={onToggleAccess}
              readOnly={readOnly}
              searchActive={searchActive}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccessTreeNode({
  node,
  depth,
  isEnabled,
  onToggleAccess,
  readOnly,
  searchActive,
}: {
  node: MenuAccessTreeNode;
  depth: number;
  isEnabled: (accessSlug: string) => boolean;
  onToggleAccess: (
    accessSlug: string,
    value: boolean,
    opts?: { moduleSlug?: string; accessGroup?: string },
  ) => void;
  readOnly?: boolean;
  searchActive: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

  useEffect(() => {
    if (searchActive) setExpanded(true);
  }, [searchActive]);

  return (
    <AccessTreeNodeRow
      node={node}
      depth={depth}
      expanded={expanded}
      onToggleExpand={() => setExpanded((v) => !v)}
      isEnabled={isEnabled}
      onToggleAccess={onToggleAccess}
      readOnly={readOnly}
      searchActive={searchActive}
    />
  );
}

export function AccessPermissionTree({
  tree,
  isEnabled,
  onToggleAccess,
  search = "",
  readOnly = false,
}: AccessPermissionTreeProps) {
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => filterTree(tree, q), [tree, q]);
  const searchActive = q.length > 0;

  if (filtered.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhum item do menu com o termo pesquisado.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {filtered.map((node) => (
        <AccessTreeNode
          key={node.id}
          node={node}
          depth={0}
          isEnabled={isEnabled}
          onToggleAccess={onToggleAccess}
          readOnly={readOnly}
          searchActive={searchActive}
        />
      ))}
    </div>
  );
}

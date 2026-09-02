"use client";

import { useMemo } from "react";
import type { PlayerTabConfig } from "@/lib/dashboard-menu.config";
import {
  buildPlayerTabGroups,
  findPlayerTabGroup,
  type PlayerTabGroupNav,
} from "@/lib/player-record-nav.config";
import { cn } from "@/lib/utils";

type PlayerRecordGroupedNavProps = {
  tabs: PlayerTabConfig[];
  activeTab: string;
  onChange: (tabId: string) => void;
  canAccessTab: (tab: PlayerTabConfig) => boolean;
};

function GroupButton({
  group,
  active,
  onClick,
}: {
  group: PlayerTabGroupNav;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
        active
          ? "border-violet-500/50 bg-violet-500/15 text-violet-100 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
          : "border-border/70 bg-zinc-900/40 text-zinc-300 hover:border-violet-500/30 hover:bg-zinc-800/70 hover:text-zinc-100",
      )}
    >
      {group.label}
    </button>
  );
}

function SubsectionButton({
  tab,
  active,
  onClick,
}: {
  tab: PlayerTabConfig;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors min-h-[40px]",
        active
          ? "border-violet-500/45 bg-violet-500/10 font-medium text-violet-100"
          : "border-border/60 bg-zinc-950/30 text-zinc-400 hover:border-violet-500/25 hover:text-zinc-100",
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
      <span className="whitespace-nowrap">{tab.label}</span>
    </button>
  );
}

export function PlayerRecordGroupedNav({
  tabs,
  activeTab,
  onChange,
  canAccessTab,
}: PlayerRecordGroupedNavProps) {
  const groups = useMemo(
    () => buildPlayerTabGroups(tabs, canAccessTab),
    [tabs, canAccessTab],
  );

  const activeGroup = useMemo(
    () => findPlayerTabGroup(groups, activeTab) ?? groups[0],
    [groups, activeTab],
  );

  const handleGroupClick = (group: PlayerTabGroupNav) => {
    if (group.tabs.some((tab) => tab.id === activeTab)) return;
    const next = group.tabs[0]?.id;
    if (next) onChange(next);
  };

  if (groups.length === 0) return null;

  const showSubsections = (activeGroup?.tabs.length ?? 0) > 1;

  return (
    <nav aria-label="Navegação da ficha do atleta" className="space-y-3">
      <div
        role="tablist"
        aria-label="Grupos da ficha"
        className={cn(
          "flex gap-2 overflow-x-auto pb-0.5",
          "[scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.35)_transparent]",
          "[&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-500/35",
        )}
      >
        {groups.map((group) => (
          <GroupButton
            key={group.id}
            group={group}
            active={activeGroup?.id === group.id}
            onClick={() => handleGroupClick(group)}
          />
        ))}
      </div>

      {showSubsections && activeGroup ? (
        <div
          role="tablist"
          aria-label={`Seções — ${activeGroup.label}`}
          className={cn(
            "flex flex-wrap gap-2 sm:gap-2.5",
            "max-sm:flex-nowrap max-sm:overflow-x-auto max-sm:pb-0.5",
            "[scrollbar-width:thin] [scrollbar-color:rgba(139,92,246,0.25)_transparent]",
          )}
        >
          {activeGroup.tabs.map((tab) => (
            <SubsectionButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => onChange(tab.id)}
            />
          ))}
        </div>
      ) : activeGroup?.tabs[0] ? (
        <p className="text-xs text-muted-foreground">
          {activeGroup.label}
          {" · "}
          <span className="text-foreground/80">{activeGroup.tabs[0].label}</span>
        </p>
      ) : null}
    </nav>
  );
}

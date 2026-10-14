"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BchTabBar } from "@/components/dashboard/boston-city-hall/BchTabBar";
import { BostonCityHallBarClose } from "@/components/dashboard/boston-city-hall/BostonCityHallBarClose";
import { BostonCityHallBarEventInventory } from "@/components/dashboard/boston-city-hall/BostonCityHallBarEventInventory";
import { BostonCityHallBarPhysicalCounts } from "@/components/dashboard/boston-city-hall/BostonCityHallBarPhysicalCounts";
import { BostonCityHallBarPos } from "@/components/dashboard/boston-city-hall/BostonCityHallBarPos";

const TABS = [
  { id: "inventory", label: "Estoque do evento" },
  { id: "pos", label: "POS" },
  { id: "counts", label: "Contagem física" },
  { id: "close", label: "Fechamento" },
] as const;

export function BostonCityHallEventWorkspaceBarTab({
  eventId,
  workspacePath,
}: {
  eventId: string;
  workspacePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("barTab");
  const tab = TABS.some((t) => t.id === raw) ? (raw as (typeof TABS)[number]["id"]) : "inventory";

  const common = useMemo(() => ({ fixedEventId: eventId, embedded: true as const }), [eventId]);

  const onBarTabChange = useCallback(
    (id: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("sec", "bar");
      p.set("barTab", id);
      router.replace(`${workspacePath}?${p.toString()}`, { scroll: false });
    },
    [router, searchParams, workspacePath],
  );

  return (
    <div className="space-y-3">
      <BchTabBar tabs={TABS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={onBarTabChange} />
      {tab === "inventory" ? <BostonCityHallBarEventInventory {...common} /> : null}
      {tab === "pos" ? <BostonCityHallBarPos {...common} /> : null}
      {tab === "counts" ? <BostonCityHallBarPhysicalCounts {...common} /> : null}
      {tab === "close" ? <BostonCityHallBarClose {...common} /> : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BostonCityHallTicketing } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketing";
import { BostonCityHallTicketOrders } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketOrders";
import { BostonCityHallTicketCheckoutDev } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckoutDev";
import { BostonCityHallTicketCheckin } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckin";
import { BostonCityHallTicketComplimentary } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketComplimentary";
import { BostonCityHallTicketSeating } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketSeating";
import { BostonCityHallTicketReports } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketReports";
import {
  BostonCityHallTicketSalesOverview,
  type BchTicketingHubTabId,
} from "@/components/dashboard/boston-city-hall/BostonCityHallTicketSalesOverview";
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchModuleSubNav } from "@/components/dashboard/boston-city-hall/BchModuleSubNav";
import { BCH_TICKETING_SUBNAV } from "@/components/dashboard/boston-city-hall/bch-subnav.config";
import { BchTabBar, type BchTabItem } from "@/components/dashboard/boston-city-hall/BchTabBar";
import {
  BchTicketingSelectionProvider,
  useBchTicketingSelection,
} from "@/components/dashboard/boston-city-hall/bch-ticketing-selection-context";

const PRIMARY_TABS: BchTabItem[] = [
  { id: "overview", label: "Eventos e vendas" },
  { id: "config", label: "Tipos e lotes" },
  { id: "orders", label: "Pedidos" },
  { id: "complimentary", label: "Cortesias" },
  { id: "seating", label: "Mesas / assentos" },
  { id: "checkin", label: "Check-in" },
  { id: "reports", label: "Relatórios" },
  { id: "checkout", label: "Laboratório" },
];

type TabId = BchTicketingHubTabId;

const TAB_IDS = new Set<string>(PRIMARY_TABS.map((t) => t.id));

function tabFromQuery(raw: string | null): TabId {
  if (raw && TAB_IDS.has(raw)) return raw as TabId;
  return "overview";
}

function BostonCityHallTicketingHubInner({
  embedded,
  fixedEventId,
}: {
  embedded?: boolean;
  fixedEventId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { setEventId } = useBchTicketingSelection();

  const queryTab = searchParams.get("tab");
  const tabs = useMemo(
    () => (embedded ? PRIMARY_TABS.filter((t) => t.id !== "overview" && t.id !== "checkout") : PRIMARY_TABS),
    [embedded],
  );

  const defaultTab: TabId = embedded ? "orders" : "overview";

  const [tab, setTabState] = useState<TabId>(() => {
    const fromQ = tabFromQuery(queryTab);
    if (embedded && (fromQ === "overview" || fromQ === "checkout")) return defaultTab;
    return fromQ;
  });

  const setTab = useCallback(
    (next: TabId) => {
      setTabState(next);
      const p = new URLSearchParams(searchParams.toString());
      if (next === "overview") p.delete("tab");
      else p.set("tab", next);
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const fromQ = tabFromQuery(queryTab);
    if (embedded && (fromQ === "overview" || fromQ === "checkout")) {
      setTabState(defaultTab);
      return;
    }
    setTabState(fromQ);
  }, [defaultTab, embedded, queryTab]);

  useEffect(() => {
    if (fixedEventId?.trim()) setEventId(fixedEventId.trim());
  }, [fixedEventId, setEventId]);

  const onNavigateTab = useCallback(
    (next: TabId, eventId?: string) => {
      if (eventId?.trim()) setEventId(eventId.trim());
      setTab(next);
    },
    [setEventId, setTab],
  );

  const inner = (
    <>
      <BchTabBar tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />
      {tab === "overview" ? <BostonCityHallTicketSalesOverview onNavigateTab={onNavigateTab} /> : null}
      {tab === "config" ? <BostonCityHallTicketing /> : null}
      {tab === "orders" ? <BostonCityHallTicketOrders /> : null}
      {tab === "complimentary" ? <BostonCityHallTicketComplimentary /> : null}
      {tab === "seating" ? <BostonCityHallTicketSeating fixedEventId={fixedEventId} /> : null}
      {tab === "checkin" ? <BostonCityHallTicketCheckin fixedEventId={fixedEventId} /> : null}
      {tab === "reports" ? <BostonCityHallTicketReports /> : null}
      {tab === "checkout" ? <BostonCityHallTicketCheckoutDev /> : null}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{inner}</div>;
  }

  return (
    <BchDestinationPageShell
      title="Bilheteria e entrada"
      subNav={<BchModuleSubNav items={BCH_TICKETING_SUBNAV} ariaLabel="Bilheteria" />}
    >
      {inner}
    </BchDestinationPageShell>
  );
}

export function BostonCityHallTicketingHub({
  fixedEventId,
  embedded,
}: {
  fixedEventId?: string;
  embedded?: boolean;
}) {
  return (
    <BchTicketingSelectionProvider fixedEventId={fixedEventId}>
      <BostonCityHallTicketingHubInner embedded={embedded} fixedEventId={fixedEventId} />
    </BchTicketingSelectionProvider>
  );
}

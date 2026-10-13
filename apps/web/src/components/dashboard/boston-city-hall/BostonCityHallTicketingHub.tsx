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
];

const CHECKOUT_TAB: BchTabItem = { id: "checkout", label: "Checkout (teste)" };

type TabId = BchTicketingHubTabId;

const TAB_IDS = new Set<string>([...PRIMARY_TABS.map((t) => t.id), CHECKOUT_TAB.id]);

function tabFromQuery(raw: string | null, devCheckout: boolean): TabId {
  if (raw && TAB_IDS.has(raw)) {
    if (raw === "checkout" && !devCheckout) return "overview";
    return raw as TabId;
  }
  return devCheckout ? "checkout" : "overview";
}

function BostonCityHallTicketingHubInner() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { setEventId } = useBchTicketingSelection();

  const devCheckout = searchParams.get("tab") === "checkout";
  const queryTab = searchParams.get("tab");
  const tabs = useMemo(
    () => (devCheckout ? [...PRIMARY_TABS, CHECKOUT_TAB] : PRIMARY_TABS),
    [devCheckout],
  );

  const [tab, setTabState] = useState<TabId>(() => tabFromQuery(queryTab, devCheckout));

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
    setTabState(tabFromQuery(queryTab, devCheckout));
  }, [queryTab, devCheckout]);

  const onNavigateTab = useCallback(
    (next: TabId, eventId?: string) => {
      if (eventId?.trim()) setEventId(eventId.trim());
      setTab(next);
    },
    [setEventId, setTab],
  );

  return (
    <div className="space-y-4">
      <BchTabBar tabs={tabs} active={tab} onChange={(id) => setTab(id as TabId)} />
      {tab === "overview" ? <BostonCityHallTicketSalesOverview onNavigateTab={onNavigateTab} /> : null}
      {tab === "config" ? <BostonCityHallTicketing /> : null}
      {tab === "orders" ? <BostonCityHallTicketOrders /> : null}
      {tab === "complimentary" ? <BostonCityHallTicketComplimentary /> : null}
      {tab === "seating" ? <BostonCityHallTicketSeating /> : null}
      {tab === "checkin" ? <BostonCityHallTicketCheckin /> : null}
      {tab === "reports" ? <BostonCityHallTicketReports /> : null}
      {tab === "checkout" ? <BostonCityHallTicketCheckoutDev /> : null}
    </div>
  );
}

export function BostonCityHallTicketingHub() {
  return (
    <BchTicketingSelectionProvider>
      <BostonCityHallTicketingHubInner />
    </BchTicketingSelectionProvider>
  );
}

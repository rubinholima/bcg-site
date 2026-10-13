"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BostonCityHallTicketing } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketing";
import { BostonCityHallTicketOrders } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketOrders";
import { BostonCityHallTicketCheckoutDev } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckoutDev";
import { BostonCityHallTicketCheckin } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckin";
import { BostonCityHallTicketComplimentary } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketComplimentary";
import { BostonCityHallTicketSeating } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketSeating";
import { BostonCityHallTicketReports } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketReports";
import { BchTabBar, type BchTabItem } from "@/components/dashboard/boston-city-hall/BchTabBar";

const PRIMARY_TABS: BchTabItem[] = [
  { id: "config", label: "Tipos e lotes" },
  { id: "orders", label: "Pedidos" },
  { id: "complimentary", label: "Cortesias" },
  { id: "seating", label: "Mesas / assentos" },
  { id: "checkin", label: "Check-in" },
  { id: "reports", label: "Relatórios" },
];

const CHECKOUT_TAB: BchTabItem = { id: "checkout", label: "Checkout (teste)" };

type TabId = (typeof PRIMARY_TABS)[number]["id"] | typeof CHECKOUT_TAB.id;

const TAB_IDS = new Set<string>([...PRIMARY_TABS.map((t) => t.id), CHECKOUT_TAB.id]);

function tabFromQuery(raw: string | null, devCheckout: boolean): TabId {
  if (raw && TAB_IDS.has(raw)) {
    if (raw === "checkout" && !devCheckout) return "config";
    return raw as TabId;
  }
  return devCheckout ? "checkout" : "config";
}

export function BostonCityHallTicketingHub() {
  const searchParams = useSearchParams();
  const devCheckout = searchParams.get("tab") === "checkout";
  const queryTab = searchParams.get("tab");
  const tabs = useMemo(
    () => (devCheckout ? [...PRIMARY_TABS, CHECKOUT_TAB] : PRIMARY_TABS),
    [devCheckout],
  );

  const [tab, setTab] = useState<TabId>(() => tabFromQuery(queryTab, devCheckout));

  useEffect(() => {
    setTab(tabFromQuery(queryTab, devCheckout));
  }, [queryTab, devCheckout]);

  return (
    <div className="space-y-4">
      <BchTabBar tabs={tabs} active={tab} onChange={setTab} />
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

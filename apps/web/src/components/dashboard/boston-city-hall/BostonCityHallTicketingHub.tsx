"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { BostonCityHallTicketing } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketing";
import { BostonCityHallTicketOrders } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketOrders";
import { BostonCityHallTicketCheckoutDev } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckoutDev";
import { BostonCityHallTicketCheckin } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckin";
import { BostonCityHallTicketComplimentary } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketComplimentary";
import { BostonCityHallTicketSeating } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketSeating";
import { BostonCityHallTicketReports } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketReports";

const PRIMARY_TABS = [
  { id: "config" as const, label: "Tipos e lotes" },
  { id: "orders" as const, label: "Pedidos" },
  { id: "complimentary" as const, label: "Cortesias" },
  { id: "seating" as const, label: "Mesas / assentos" },
  { id: "checkin" as const, label: "Check-in" },
  { id: "reports" as const, label: "Relatórios" },
];

const CHECKOUT_TAB = { id: "checkout" as const, label: "Checkout (teste)" };

type TabId = (typeof PRIMARY_TABS)[number]["id"] | typeof CHECKOUT_TAB.id;

export function BostonCityHallTicketingHub() {
  const searchParams = useSearchParams();
  const devCheckout = searchParams.get("tab") === "checkout";
  const tabs = useMemo(
    () => (devCheckout ? [...PRIMARY_TABS, CHECKOUT_TAB] : PRIMARY_TABS),
    [devCheckout],
  );

  const [tab, setTab] = useState<TabId>(() => (devCheckout ? "checkout" : "config"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[44px] rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
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

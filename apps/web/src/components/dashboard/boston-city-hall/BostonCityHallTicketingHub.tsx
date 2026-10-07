"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BostonCityHallTicketing } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketing";
import { BostonCityHallTicketOrders } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketOrders";
import { BostonCityHallTicketCheckoutDev } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckoutDev";
import { BostonCityHallTicketCheckin } from "@/components/dashboard/boston-city-hall/BostonCityHallTicketCheckin";

const TABS = [
  { id: "config" as const, label: "Tipos e lotes" },
  { id: "orders" as const, label: "Pedidos" },
  { id: "checkin" as const, label: "Check-in" },
  { id: "checkout" as const, label: "Checkout (teste)" },
];

export function BostonCityHallTicketingHub() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("config");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "min-h-[44px] shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
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
      {tab === "checkin" ? <BostonCityHallTicketCheckin /> : null}
      {tab === "checkout" ? <BostonCityHallTicketCheckoutDev /> : null}
    </div>
  );
}

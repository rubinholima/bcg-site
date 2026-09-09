"use client";

import { useDashboardPresence } from "@/hooks/useDashboardPresence";

/** Heartbeat de presença — montado no shell do dashboard. */
export function DashboardPresenceTracker() {
  useDashboardPresence();
  return null;
}

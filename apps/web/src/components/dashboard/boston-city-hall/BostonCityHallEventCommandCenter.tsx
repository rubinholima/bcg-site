"use client";

import { useEffect } from "react";
import { BostonCityHallEventWorkspaceView } from "@/components/dashboard/boston-city-hall/BostonCityHallEventWorkspaceView";
import { useBchAppShellEvent } from "@/components/dashboard/boston-city-hall/bch-app-shell-event-context";
import { useBchEventOperationalSnapshot } from "@/components/dashboard/boston-city-hall/use-bch-event-operational-snapshot";

export function BostonCityHallEventCommandCenter({ eventId }: { eventId: string }) {
  const { setEventName } = useBchAppShellEvent();
  const snapshot = useBchEventOperationalSnapshot(eventId);

  useEffect(() => {
    setEventName(snapshot.event?.name ?? null);
    return () => setEventName(null);
  }, [snapshot.event?.name, setEventName]);

  return <BostonCityHallEventWorkspaceView snapshot={snapshot} />;
}

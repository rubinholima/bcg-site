"use client";

import { Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-sky-400/80" />
        </div>
      }
    >
      <BostonCityHallEventWorkspaceView snapshot={snapshot} />
    </Suspense>
  );
}

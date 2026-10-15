"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BchAppShellHeader } from "@/components/dashboard/boston-city-hall/BchAppShellHeader";
import { BchAppShellNav } from "@/components/dashboard/boston-city-hall/BchAppShellNav";
import { BchAppShellEventContext } from "@/components/dashboard/boston-city-hall/bch-app-shell-event-context";
import { cn } from "@/lib/utils";

export function BchAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const [mobileNav, setMobileNav] = useState(false);
  const [eventName, setEventName] = useState<string | null>(null);

  const eventIdFromPath = useMemo(() => {
    const m = pathname.match(/\/boston-city-hall\/eventos\/([^/]+)/);
    const id = m?.[1];
    if (!id || id === "setup" || id === "financeiro") return null;
    return id;
  }, [pathname]);

  const ctx = useMemo(
    () => ({
      eventId: eventIdFromPath,
      eventName,
      setEventName,
    }),
    [eventIdFromPath, eventName],
  );

  return (
    <BchAppShellEventContext.Provider value={ctx}>
      <div className="flex h-[100dvh] min-h-0 min-w-0 flex-col overflow-hidden bg-[#070b12] text-slate-200">
        <BchAppShellHeader
          pathname={pathname}
          eventName={eventName}
          navOpen={mobileNav}
          onToggleNav={() => setMobileNav((v) => !v)}
        />

        <div className="flex min-h-0 min-w-0 flex-1">
          {mobileNav ? (
            <button
              type="button"
              aria-label="Fechar menu"
              className="fixed inset-0 z-30 bg-black/60 lg:hidden"
              onClick={() => setMobileNav(false)}
            />
          ) : null}

          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 flex w-[min(100vw-3rem,15.25rem)] flex-col border-r border-slate-800/90 bg-[#0a101c] pt-[56px] transition-transform lg:static lg:z-auto lg:w-[15.25rem] lg:shrink-0 lg:translate-x-0 lg:pt-0",
              mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            )}
          >
            <BchAppShellNav onNavigate={() => setMobileNav(false)} />
          </aside>

          <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden">
            <div className="dashboard-scroll min-h-0 h-full w-full overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </BchAppShellEventContext.Provider>
  );
}

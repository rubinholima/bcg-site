"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BostonCityHallBarPos } from "@/components/dashboard/boston-city-hall/BostonCityHallBarPos";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { Button } from "@/components/ui/button";

export default function BostonCityHallEventPosPage() {
  const params = useParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  if (!eventId) return null;

  return (
    <div className="min-h-[100dvh] bg-[#07090e] text-slate-100">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-800/80 bg-[#07090e]/95 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" className="min-h-[44px]" asChild>
          <Link href={`${BCH_BASE}/eventos/${encodeURIComponent(eventId)}?sec=bar`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="text-sm font-medium">POS · evento</p>
      </header>
      <main className="p-3 md:p-4">
        <BostonCityHallBarPos fixedEventId={eventId} embedded tabletMode />
      </main>
    </div>
  );
}

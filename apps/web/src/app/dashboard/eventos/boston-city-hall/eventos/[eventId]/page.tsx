"use client";

import { useParams } from "next/navigation";
import { BostonCityHallEventCommandCenter } from "@/components/dashboard/boston-city-hall/BostonCityHallEventCommandCenter";

export default function BostonCityHallEventWorkspacePage() {
  const params = useParams();
  const eventId = typeof params.eventId === "string" ? params.eventId : "";
  if (!eventId) return null;
  return <BostonCityHallEventCommandCenter eventId={eventId} />;
}

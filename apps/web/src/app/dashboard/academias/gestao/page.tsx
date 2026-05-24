import type { Metadata } from "next";
import { DashboardEmbedFrame } from "@/components/dashboard/DashboardEmbedFrame";
import { ACADEMIAS_EMBED_URLS } from "@/lib/academias-embed";

export const metadata: Metadata = {
  title: "Academias · Gestão",
};

export default function AcademiasGestaoPage() {
  return (
    <DashboardEmbedFrame
      src={ACADEMIAS_EMBED_URLS.gestao}
      title="Boston City Academias — Gestão"
    />
  );
}

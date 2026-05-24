import type { Metadata } from "next";
import { DashboardEmbedFrame } from "@/components/dashboard/DashboardEmbedFrame";
import { ACADEMIAS_EMBED_URLS } from "@/lib/academias-embed";

export const metadata: Metadata = {
  title: "Academias · Portal do aluno",
};

export default function AcademiasPortalPage() {
  return (
    <DashboardEmbedFrame
      src={ACADEMIAS_EMBED_URLS.portal}
      title="Boston City Academias — Portal do aluno"
    />
  );
}

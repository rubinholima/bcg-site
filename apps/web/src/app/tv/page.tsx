import type { Metadata } from "next";
import { BostonTvInstallerView } from "@/components/boston-tv/BostonTvInstallerView";
import { fetchHallInstallerScreens } from "@/lib/boston-tv-hall";

export const metadata: Metadata = {
  title: "Boston TV — Instalação",
  description: "Escolha a TV e abra o player Boston TV no Hall.",
};

export default async function BostonTvInstallerPage() {
  const screens = await fetchHallInstallerScreens();
  return <BostonTvInstallerView screens={screens} />;
}

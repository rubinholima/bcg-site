import type { Metadata } from "next";
import { fetchGroupHomeFromBackend } from "@/lib/home-content";
import { fetchGroup } from "@/lib/home-data";
import { findEmailServersBlock } from "@/lib/email-servers";
import type { HomeContentBlock } from "@/types/home-content";
import { EmailServerHubClient } from "./EmailServerHubClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Servidores de e-mail — Boston City Group",
  description: "Acesso aos webmails das organizações do Boston City Group.",
};

export default async function EmailServerPage() {
  const [groupHome, group] = await Promise.all([fetchGroupHomeFromBackend(), fetchGroup()]);
  const blocks = (groupHome?.content?.blocks ?? []) as HomeContentBlock[];
  const emailBlock = findEmailServersBlock(blocks);

  return (
    <EmailServerHubClient
      groupHome={groupHome}
      groupName={group?.name ?? "Boston City Group"}
      initialBlock={emailBlock}
    />
  );
}

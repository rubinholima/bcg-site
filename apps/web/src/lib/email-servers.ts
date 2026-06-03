import type { HomeContentBlock } from "@/types/home-content";
import type { EmailServerItem } from "@/types/home-content";
import { isBlockHidden } from "@/components/dashboard/page-builder/block-utils";

/** Rota pública do hub (somente domínio do grupo, ex.: bostoncitygroup.biz/email-server). */
export const EMAIL_SERVERS_HUB_PATH = "/email-server";

export function findEmailServersBlock(blocks: HomeContentBlock[]): HomeContentBlock | null {
  const block = blocks.find((b) => b.type === "email_servers");
  if (!block || isBlockHidden(block)) return null;
  return block;
}

export function parseEmailServersItems(block: HomeContentBlock | null | undefined): EmailServerItem[] {
  const raw = block?.config?.emailServersItems;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = item as EmailServerItem;
      const url = String(row.url ?? "").trim();
      if (!url) return null;
      return {
        id: row.id,
        namePt: String(row.namePt ?? row.nameEn ?? "").trim(),
        nameEn: String(row.nameEn ?? row.namePt ?? "").trim(),
        url,
        logoUrl: String(row.logoUrl ?? "").trim() || undefined,
      };
    })
    .filter(Boolean) as EmailServerItem[];
}

export function emailServerDisplayName(item: EmailServerItem, lang: "pt" | "en"): string {
  const name =
    lang === "pt"
      ? (item.namePt ?? item.nameEn ?? "").trim()
      : (item.nameEn ?? item.namePt ?? "").trim();
  return name || (lang === "pt" ? "E-mail" : "Email");
}

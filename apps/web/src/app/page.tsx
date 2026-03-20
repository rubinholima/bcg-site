import { fetchGroupHomeFromBackend } from "@/lib/home-content";
import { fetchPublicPortfolio } from "@/lib/public-portfolio";
import { fetchPublicEvents } from "@/lib/public-events";
import { fetchGroup } from "@/lib/home-data";
import HomeClient from "./HomeClient";

/** Sempre buscar dados no servidor por request — nunca cache/static. Dados vêm do Group (bcg), não da tabela Page. */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Página principal (Home) do BCG.
 * Busca dados no servidor diretamente do backend (127.0.0.1:3001),
 * evitando passar pelo Nginx que pode corromper UTF-8 em produção.
 */
export default async function Page() {
  const [groupHomeRes, portfolioRes, eventsRes, groupRes] = await Promise.allSettled([
    fetchGroupHomeFromBackend(),
    fetchPublicPortfolio(),
    fetchPublicEvents(),
    fetchGroup(),
  ]);

  const groupHome = groupHomeRes.status === "fulfilled" ? groupHomeRes.value : null;
  const portfolio = portfolioRes.status === "fulfilled" ? portfolioRes.value : [];
  const events = eventsRes.status === "fulfilled" ? eventsRes.value : [];
  const group = groupRes.status === "fulfilled" ? groupRes.value : null;

  return (
    <HomeClient
      initialGroupHome={groupHome}
      initialPortfolio={portfolio}
      initialEvents={events}
      initialGroup={group}
    />
  );
}

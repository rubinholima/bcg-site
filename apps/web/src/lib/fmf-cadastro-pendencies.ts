import type {
  FmfCadastroPendencyAction,
  FmfCadastroPendencyItem,
} from "@/lib/fmf-cadastro-pendencies.types";

export function playerEditCadastroUrl(playerId: string): string {
  return `/dashboard/cadastros/jogadores/${playerId}/edit?tab=dados`;
}

export function playersSearchUrl(tenantId: string, term: string): string {
  const params = new URLSearchParams({ tenantId, search: term });
  return `/dashboard/cadastros/jogadores?${params.toString()}`;
}

export function newPlayerUrl(): string {
  return "/dashboard/cadastros/jogadores/new";
}

export function resolveCadastroPendencyActions(
  tenantId: string,
  item: FmfCadastroPendencyItem,
): FmfCadastroPendencyAction[] {
  if (item.candidatePlayers.length === 1) {
    const player = item.candidatePlayers[0]!;
    return [
      {
        label: "Corrigir cadastro",
        href: playerEditCadastroUrl(player.id),
        variant: "default",
      },
    ];
  }

  if (item.candidatePlayers.length > 1) {
    return item.candidatePlayers.map((player) => ({
      label: player.name,
      href: playerEditCadastroUrl(player.id),
      variant: "outline" as const,
    }));
  }

  const searchTerm = item.cbfRegistration || item.sourceName;
  return [
    {
      label: "Buscar no cadastro",
      href: playersSearchUrl(tenantId, searchTerm),
      variant: "default",
    },
    {
      label: "Novo atleta",
      href: newPlayerUrl(),
      variant: "outline",
    },
  ];
}

import { STATUS_OPTIONS } from "@/lib/analysis-types";

export type PlayerMatchAvailabilityInput = {
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  /** Registro CBF (registrationProfile.sports.cbf) — proxy para estar no BID. */
  cbfRegistration?: string | null;
};

export type PlayerMatchAvailability = {
  apto: boolean;
  label: "Apto" | "Não apto";
  /** Motivo completo quando não apto. */
  reason: string | null;
  /** Versão curta para cabeçalho / lista. */
  shortReason: string | null;
};

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Aptidão para jogo — independente de situação no clube (ativo/desligado/emprestado). */
export function getPlayerMatchAvailability(
  input: PlayerMatchAvailabilityInput,
): PlayerMatchAvailability {
  const status = (input.status?.trim() || "available").toLowerCase();
  const details = input.statusDetails?.trim() || null;
  const yellow = input.yellowCards ?? 0;
  const red = input.redCards ?? 0;

  if (status === "not_in_squad") {
    return {
      apto: false,
      label: "Não apto",
      reason: "Fora do elenco",
      shortReason: "Fora do elenco",
    };
  }

  if (status === "injured") {
    const shortReason = details || "Lesão física";
    return {
      apto: false,
      label: "Não apto",
      reason: details ? `Lesão — ${details}` : "Lesão física",
      shortReason,
    };
  }

  if (status === "suspended") {
    let shortReason = "Suspenso por disciplina";
    if (details) shortReason = details;
    else if (red > 0) shortReason = "Cartão vermelho";
    else if (yellow >= 3) shortReason = "Acúmulo de cartões amarelos";
    return {
      apto: false,
      label: "Não apto",
      reason: shortReason,
      shortReason,
    };
  }

  if (status === "absent") {
    const shortReason = details || "Ausente";
    return {
      apto: false,
      label: "Não apto",
      reason: shortReason,
      shortReason,
    };
  }

  const cbf = input.cbfRegistration?.trim();
  if (!cbf) {
    return {
      apto: false,
      label: "Não apto",
      reason: "Sem registro CBF — ainda não está no BID",
      shortReason: "Não está no BID",
    };
  }

  if (status === "on_bench") {
    return {
      apto: true,
      label: "Apto",
      reason: null,
      shortReason: null,
    };
  }

  if (status !== "available") {
    const lbl = statusLabel(status);
    return {
      apto: false,
      label: "Não apto",
      reason: lbl,
      shortReason: lbl,
    };
  }

  return {
    apto: true,
    label: "Apto",
    reason: null,
    shortReason: null,
  };
}

export function buildPlayerMatchAvailabilityInput(player: {
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  registrationProfile?: unknown;
}): PlayerMatchAvailabilityInput {
  const profile =
    player.registrationProfile && typeof player.registrationProfile === "object"
      ? (player.registrationProfile as { sports?: { cbf?: string } })
      : null;
  return {
    status: player.status,
    statusDetails: player.statusDetails,
    statusUntil: player.statusUntil,
    yellowCards: player.yellowCards,
    redCards: player.redCards,
    cbfRegistration: profile?.sports?.cbf,
  };
}

import { STATUS_OPTIONS } from "@/lib/analysis-types";

export type PlayerMatchAvailabilityInput = {
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  /** Registro CBF — apenas informativo; aptidão segue o campo status do atleta. */
  cbfRegistration?: string | null;
  /** Quando true, exibe aviso de CBF/BID pendente mesmo estando apto. */
  bidRegistrationPending?: boolean;
};

export type PlayerMatchAvailability = {
  apto: boolean;
  label: "Apto" | "Não apto";
  /** Motivo completo quando não apto. */
  reason: string | null;
  /** Versão curta para cabeçalho / lista. */
  shortReason: string | null;
  /** Aviso opcional (ex.: CBF não preenchido) sem bloquear aptidão. */
  warning: string | null;
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
      warning: null,
    };
  }

  if (status === "injured") {
    const shortReason = details || "Lesão física";
    return {
      apto: false,
      label: "Não apto",
      reason: details ? `Lesão — ${details}` : "Lesão física",
      shortReason,
      warning: null,
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
      warning: null,
    };
  }

  if (status === "absent") {
    const shortReason = details || "Ausente";
    return {
      apto: false,
      label: "Não apto",
      reason: shortReason,
      shortReason,
      warning: null,
    };
  }

  const cbf = input.cbfRegistration?.trim();
  const bidWarning =
    input.bidRegistrationPending && !cbf
      ? "Registro CBF não cadastrado no sistema"
      : null;

  if (status === "on_bench" || status === "available") {
    return {
      apto: true,
      label: "Apto",
      reason: null,
      shortReason: null,
      warning: bidWarning,
    };
  }

  const lbl = statusLabel(status);
  return {
    apto: false,
    label: "Não apto",
    reason: lbl,
    shortReason: lbl,
    warning: null,
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

import { STATUS_OPTIONS } from "@/lib/analysis-types";

export type PlayerMatchAvailabilityInput = {
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  /** Registro CBF / BID no cadastro esportivo. */
  cbfRegistration?: string | null;
  /** ISO — documentação confirmada pelo RH (ou fluxo de convite aprovado). */
  documentationApprovedAt?: string | null;
};

export type PlayerMatchAvailabilityLabel = "Apto" | "No BID" | "Não apto";

export type PlayerMatchAvailability = {
  /** false = não convocável (inclui No BID). */
  apto: boolean;
  label: PlayerMatchAvailabilityLabel;
  /** Motivo completo quando não apto ou No BID. */
  reason: string | null;
  /** Versão curta para cabeçalho / lista. */
  shortReason: string | null;
  warning: null;
};

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function noBid(shortReason: string, reason?: string): PlayerMatchAvailability {
  return {
    apto: false,
    label: "No BID",
    reason: reason ?? shortReason,
    shortReason,
    warning: null,
  };
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

  const docApproved = Boolean(input.documentationApprovedAt?.trim());
  const cbf = input.cbfRegistration?.trim();

  if (status === "on_bench" || status === "available") {
    if (!docApproved) {
      return noBid("Documentação pendente", "Documentação pendente de confirmação pelo RH");
    }
    if (!cbf) {
      return noBid("Aguardando registro no BID", "Registro CBF/BID não cadastrado");
    }
    return {
      apto: true,
      label: "Apto",
      reason: null,
      shortReason: null,
      warning: null,
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
      ? (player.registrationProfile as {
          sports?: { cbf?: string; documentationApprovedAt?: string };
        })
      : null;
  return {
    status: player.status,
    statusDetails: player.statusDetails,
    statusUntil: player.statusUntil,
    yellowCards: player.yellowCards,
    redCards: player.redCards,
    cbfRegistration: profile?.sports?.cbf,
    documentationApprovedAt: profile?.sports?.documentationApprovedAt,
  };
}

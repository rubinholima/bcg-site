/** Aptidão para jogo — espelhar apps/web/src/lib/player-match-availability.ts */

export type PlayerMatchAvailabilityInput = {
  status?: string | null;
  statusDetails?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  cbfRegistration?: string | null;
  documentationApprovedAt?: string | null;
};

export type PlayerMatchAvailabilityLabel = 'Apto' | 'No BID' | 'Não apto';

export type PlayerMatchAvailability = {
  apto: boolean;
  label: PlayerMatchAvailabilityLabel;
  shortReason: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Apto',
  injured: 'Lesionado',
  suspended: 'Suspenso',
  absent: 'Ausente',
  on_bench: 'No banco',
  not_in_squad: 'Fora do elenco',
};

function noBid(shortReason: string): PlayerMatchAvailability {
  return { apto: false, label: 'No BID', shortReason };
}

export function getPlayerMatchAvailability(
  input: PlayerMatchAvailabilityInput,
): PlayerMatchAvailability {
  const status = (input.status?.trim() || 'available').toLowerCase();
  const details = input.statusDetails?.trim() || null;
  const yellow = input.yellowCards ?? 0;
  const red = input.redCards ?? 0;

  if (status === 'not_in_squad') {
    return { apto: false, label: 'Não apto', shortReason: 'Fora do elenco' };
  }
  if (status === 'injured') {
    return { apto: false, label: 'Não apto', shortReason: details || 'Lesão física' };
  }
  if (status === 'suspended') {
    let shortReason = 'Suspenso por disciplina';
    if (details) shortReason = details;
    else if (red > 0) shortReason = 'Cartão vermelho';
    else if (yellow >= 3) shortReason = 'Acúmulo de cartões amarelos';
    return { apto: false, label: 'Não apto', shortReason };
  }
  if (status === 'absent') {
    return { apto: false, label: 'Não apto', shortReason: details || 'Ausente' };
  }

  const docApproved = Boolean(input.documentationApprovedAt?.trim());
  const cbf = input.cbfRegistration?.trim();

  if (status === 'available' || status === 'on_bench') {
    if (!docApproved) {
      return noBid('Documentação pendente');
    }
    if (!cbf) {
      return noBid('Aguardando registro no BID');
    }
    return { apto: true, label: 'Apto', shortReason: null };
  }

  const lbl = STATUS_LABELS[status] ?? status;
  return { apto: false, label: 'Não apto', shortReason: lbl };
}

export function buildPlayerMatchAvailabilityInput(player: {
  status?: string | null;
  statusDetails?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  registrationProfile?: unknown;
}): PlayerMatchAvailabilityInput {
  const profile =
    player.registrationProfile && typeof player.registrationProfile === 'object'
      ? (player.registrationProfile as {
          sports?: { cbf?: string; documentationApprovedAt?: string };
        })
      : null;
  return {
    status: player.status,
    statusDetails: player.statusDetails,
    yellowCards: player.yellowCards,
    redCards: player.redCards,
    cbfRegistration: profile?.sports?.cbf,
    documentationApprovedAt: profile?.sports?.documentationApprovedAt,
  };
}

export const COACH_TRAINING_ACTIVITY_KINDS = [
  'aquecimento',
  'desenvolvimento',
  'principal',
  'encerramento',
] as const;

export type CoachTrainingActivityKind = (typeof COACH_TRAINING_ACTIVITY_KINDS)[number];

export const COACH_TRAINING_ACTIVITY_LABELS: Record<CoachTrainingActivityKind, string> = {
  aquecimento: 'Aquecimento',
  desenvolvimento: 'Desenvolvimento',
  principal: 'Atividade principal',
  encerramento: 'Encerramento',
};

export const COACH_REPORT_ATTACHMENT_KINDS = [
  'sumula',
  'analista',
  'scout',
  'outro',
] as const;

export const COACH_TRAINING_ATTACHMENT_KINDS = [
  'plano_treino',
  'video_referencia',
  'outro',
] as const;

export const COACH_TRAINING_ATTACHMENT_LABELS: Record<
  (typeof COACH_TRAINING_ATTACHMENT_KINDS)[number],
  string
> = {
  plano_treino: 'Plano de treino (PDF)',
  video_referencia: 'Vídeo de referência',
  outro: 'Outro',
};

export const COACH_REPORT_STATUS = ['rascunho', 'finalizado'] as const;

export const COACH_TEAM_REPORT_PERIOD = ['geral', 'mensal', 'trimestral'] as const;

export const COACH_TEAM_REPORT_STATUS = ['rascunho', 'enviado'] as const;

export const COACH_TEAM_PLAYER_ACTION = ['dispensa', 'promocao'] as const;

export const coachTeamReportInclude = {
  playerActions: {
    include: {
      player: {
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          category: true,
          registrationProfile: true,
        },
      },
    },
  },
  staff: { select: { id: true, name: true, role: true } },
} as const;

export const coachMatchReportInclude = {
  playerRatings: {
    include: {
      player: {
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          photoUrl: true,
          category: true,
          registrationProfile: true,
        },
      },
    },
  },
  attachments: true,
  travelLogistics: {
    select: {
      id: true,
      matchDate: true,
      opponentName: true,
      championshipName: true,
      category: true,
      categories: true,
      isHomeMatch: true,
      stadiumName: true,
    },
  },
  staff: { select: { id: true, name: true, role: true } },
} as const;

export const coachTrainingSessionInclude = {
  activities: { orderBy: { sortOrder: 'asc' as const } },
  attachments: true,
  agendaEntry: {
    select: {
      id: true,
      title: true,
      type: true,
      startAt: true,
      endAt: true,
      location: true,
    },
  },
  planTemplate: {
    select: { id: true, title: true, fileUrl: true, category: true },
  },
  playerEntries: {
    include: {
      player: {
        select: {
          id: true,
          name: true,
          jerseyNumber: true,
          photoUrl: true,
          category: true,
          registrationProfile: true,
        },
      },
    },
  },
  staff: { select: { id: true, name: true, role: true } },
} as const;

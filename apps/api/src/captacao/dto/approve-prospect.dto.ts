export class ApproveProspectDto {
  notes?: string;
}

export class PromoteProspectDto {
  /** Se informado, vincula a um jogador já existente em vez de criar */
  playerId?: string;
}

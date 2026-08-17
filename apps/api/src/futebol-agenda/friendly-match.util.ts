/** Competência padrão para jogos amistosos cadastrados manualmente. */
export const FRIENDLY_CHAMPIONSHIP_NAME = 'Amistoso';

export function inferIsHomeFromJogoTitle(title: string): boolean | null {
  const normalized = title.trim().toLocaleLowerCase('pt-BR');
  if (normalized.startsWith('jogo em casa')) return true;
  if (normalized.startsWith('jogo fora')) return false;
  return null;
}

export function parseOpponentFromJogoTitle(title: string): string {
  const trimmed = title.trim();
  const normalized = trimmed.toLocaleLowerCase('pt-BR');
  for (const prefix of ['jogo em casa', 'jogo fora', 'jogo']) {
    if (normalized.startsWith(prefix)) {
      const rest = trimmed.slice(prefix.length).replace(/^[\s·\-–—:]+/, '').trim();
      if (rest) return rest;
    }
  }
  return trimmed;
}

export function buildJogoAgendaTitle(opponentName: string, isHomeMatch: boolean): string {
  const opponent = opponentName.trim().toLocaleUpperCase('pt-BR');
  return isHomeMatch ? `JOGO EM CASA · ${opponent}` : `JOGO FORA · ${opponent}`;
}

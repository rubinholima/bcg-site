/** Modos operacionais — mapeiam para blockGroupId/blockSequence sem expor IDs técnicos na UI. */
export type PrepBlockRelationMode = 'separate' | 'simultaneous' | 'sequential';

const INDEP_PREFIX = 'prep-indep:';
const JOINT_PREFIX = 'joint:';

export function encodePrepBlockFields(input: {
  mode: PrepBlockRelationMode;
  sessionId: string;
  agendaEntryId?: string | null;
  sequentialOrder?: number;
  peerSessionId?: string | null;
}): { blockGroupId: string | null; blockSequence: number } {
  const agenda = input.agendaEntryId?.trim() || null;
  const peer = input.peerSessionId?.trim() || null;
  const seq = Math.max(0, Math.trunc(input.sequentialOrder ?? 1));

  switch (input.mode) {
    case 'simultaneous':
      if (agenda) {
        return { blockGroupId: null, blockSequence: 0 };
      }
      if (peer) {
        return { blockGroupId: `${JOINT_PREFIX}${peer}`, blockSequence: 0 };
      }
      return { blockGroupId: null, blockSequence: 0 };
    case 'sequential':
      return { blockGroupId: null, blockSequence: seq > 0 ? seq : 1 };
    case 'separate':
    default:
      if (agenda) {
        return { blockGroupId: `${INDEP_PREFIX}${input.sessionId}`, blockSequence: 0 };
      }
      return { blockGroupId: null, blockSequence: 0 };
  }
}

export function decodePrepBlockFields(session: {
  id: string;
  blockGroupId?: string | null;
  agendaEntryId?: string | null;
  blockSequence?: number | null;
}): {
  mode: PrepBlockRelationMode;
  peerSessionId: string | null;
  sequentialOrder: number;
} {
  const bg = session.blockGroupId?.trim() || null;
  const agenda = session.agendaEntryId?.trim() || null;
  const seq = session.blockSequence ?? 0;

  if (bg?.startsWith(INDEP_PREFIX)) {
    return { mode: 'separate', peerSessionId: null, sequentialOrder: 0 };
  }
  if (bg?.startsWith(JOINT_PREFIX)) {
    return { mode: 'simultaneous', peerSessionId: bg.slice(JOINT_PREFIX.length) || null, sequentialOrder: 0 };
  }
  if (agenda) {
    return { mode: 'simultaneous', peerSessionId: null, sequentialOrder: 0 };
  }
  if (seq > 0) {
    return { mode: 'sequential', peerSessionId: null, sequentialOrder: seq };
  }
  return { mode: 'separate', peerSessionId: null, sequentialOrder: 0 };
}

/** Após create, normaliza prep-indep:draft → prep-indep:{id} */
export function normalizeIndepBlockGroupId(blockGroupId: string | null, sessionId: string): string | null {
  if (!blockGroupId?.startsWith(INDEP_PREFIX)) return blockGroupId;
  return `${INDEP_PREFIX}${sessionId}`;
}

import type {
  BeatscodeContractExportRow,
  BeatscodeContractMenuCategory,
} from './beatscode-contract-export.types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  rescinded: 'Rescindido',
  completed: 'Concluído',
  additive: 'Aditivo',
};

const VENDA_FUTURA_TYPE_IDS = new Set([12, 20]);
const COMISSAO_TYPE_IDS = new Set([3, 9, 28, 29, 30, 32, 35]);
const MANUTENCAO_TYPE_IDS = new Set([10, 22, 23, 25, 31, 32]);

export function beatscodeContractStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** DD/MM/YYYY ou DD/MM/YYYY HH:mm:ss → ISO date (YYYY-MM-DD) */
export function parseBeatscodeContractDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export function resolveContractMenuCategory(
  contractTypeId: number | null,
  contractTypeName: string | null,
  technicalCommitteeEmployeeIds: Set<number>,
  employeeId: number | null,
): BeatscodeContractMenuCategory {
  if (employeeId != null && technicalCommitteeEmployeeIds.has(employeeId)) {
    return 'comissao_tecnica';
  }
  if (contractTypeId != null && VENDA_FUTURA_TYPE_IDS.has(contractTypeId)) {
    return 'venda_futura';
  }
  const name = (contractTypeName ?? '').toLowerCase();
  if (name.includes('venda futura') || name.includes('preferência de compra')) {
    return 'venda_futura';
  }
  if (
    contractTypeId != null &&
    (COMISSAO_TYPE_IDS.has(contractTypeId) || name.includes('comiss'))
  ) {
    return 'comissao_tecnica';
  }
  if (
    contractTypeId != null &&
    (MANUTENCAO_TYPE_IDS.has(contractTypeId) ||
      name.includes('repactua') ||
      name.includes('moradia') ||
      name.includes('ajuda de custos') ||
      name.includes('memorando'))
  ) {
    return 'manutencao';
  }
  return 'atleta';
}

export function mapBeatscodeContractRow(
  row: Record<string, unknown>,
  typeById: Map<number, string>,
  endReasonById: Map<number, string>,
  technicalCommitteeEmployeeIds: Set<number>,
): BeatscodeContractExportRow | null {
  const beatscodeId = Number(row.id);
  if (!Number.isFinite(beatscodeId)) return null;

  const employeeIdRaw = row.employeeId;
  const employeeId =
    employeeIdRaw != null && Number.isFinite(Number(employeeIdRaw))
      ? Number(employeeIdRaw)
      : null;

  const contractTypeId =
    row.contractTypeId != null && Number.isFinite(Number(row.contractTypeId))
      ? Number(row.contractTypeId)
      : null;
  const contractTypeName =
    contractTypeId != null ? typeById.get(contractTypeId) ?? null : null;

  const status = String(row.status ?? 'unknown');
  const contractEndReasonId =
    row.contractEndReasonId != null && Number.isFinite(Number(row.contractEndReasonId))
      ? Number(row.contractEndReasonId)
      : null;

  const attachmentIds = Array.isArray(row.attachmentId)
    ? row.attachmentId.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : [];

  const extraFileIds = [
    ...(Array.isArray(row.extraFileId) ? row.extraFileId : row.extraFileId != null ? [row.extraFileId] : []),
    ...(Array.isArray(row.extraFile2Id) ? row.extraFile2Id : row.extraFile2Id != null ? [row.extraFile2Id] : []),
  ]
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));

  return {
    beatscodeId,
    employeeId,
    menuCategory: resolveContractMenuCategory(
      contractTypeId,
      contractTypeName,
      technicalCommitteeEmployeeIds,
      employeeId,
    ),
    contractTypeId,
    contractTypeName,
    number: row.number != null ? String(row.number) : null,
    initialDate: parseBeatscodeContractDate(row.initialDate),
    finalDate: parseBeatscodeContractDate(row.finalDate),
    terminationDate: parseBeatscodeContractDate(row.terminationDate),
    status,
    statusLabel: beatscodeContractStatusLabel(status),
    observation: row.observation != null ? String(row.observation) : null,
    additive: Boolean(row.additive),
    confirm: Boolean(row.confirm),
    contractEndReasonId,
    contractEndReasonName:
      contractEndReasonId != null
        ? endReasonById.get(contractEndReasonId) ?? null
        : null,
    notificationEmail: Boolean(row.notificationEmail),
    attachmentIds,
    extraFileIds,
    team: row.team ?? null,
    partsId: Array.isArray(row.partsId) ? row.partsId : [],
    clauseId: Array.isArray(row.clauseId) ? row.clauseId : [],
    createDate: row.createDate != null ? String(row.createDate) : null,
    raw: row,
  };
}

export type StoredBeatscodeContract = {
  externalId: string;
  beatscodeId: number;
  menuCategory: BeatscodeContractMenuCategory;
  contractTypeId: number | null;
  contractTypeName: string | null;
  number: string | null;
  initialDate: string | null;
  finalDate: string | null;
  terminationDate: string | null;
  status: string;
  statusLabel: string;
  observation: string | null;
  additive: boolean;
  contractEndReasonId: number | null;
  contractEndReasonName: string | null;
  attachmentIds: number[];
  extraFileIds: number[];
  files?: Array<{
    attachmentId: number;
    fileUrl: string;
    fileKey?: string;
    name: string;
    legalDocumentId?: string;
  }>;
  syncedAt: string;
};

export function toStoredBeatscodeContract(
  row: BeatscodeContractExportRow,
): StoredBeatscodeContract {
  return {
    externalId: `beatscode-contract-${row.beatscodeId}`,
    beatscodeId: row.beatscodeId,
    menuCategory: row.menuCategory,
    contractTypeId: row.contractTypeId,
    contractTypeName: row.contractTypeName,
    number: row.number,
    initialDate: row.initialDate,
    finalDate: row.finalDate,
    terminationDate: row.terminationDate,
    status: row.status,
    statusLabel: row.statusLabel,
    observation: row.observation,
    additive: row.additive,
    contractEndReasonId: row.contractEndReasonId,
    contractEndReasonName: row.contractEndReasonName,
    attachmentIds: row.attachmentIds,
    extraFileIds: row.extraFileIds,
    syncedAt: new Date().toISOString(),
  };
}

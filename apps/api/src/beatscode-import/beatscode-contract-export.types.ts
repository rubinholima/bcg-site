export type BeatscodeContractMenuCategory =
  | 'atleta'
  | 'venda_futura'
  | 'comissao_tecnica'
  | 'manutencao';

export type BeatscodeContractExportRow = {
  beatscodeId: number;
  employeeId: number | null;
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
  confirm: boolean;
  contractEndReasonId: number | null;
  contractEndReasonName: string | null;
  notificationEmail: boolean;
  attachmentIds: number[];
  extraFileIds: number[];
  team: unknown;
  partsId: unknown[];
  clauseId: unknown[];
  createDate: string | null;
  raw: Record<string, unknown>;
};

export type BeatscodeContractExportFile = {
  version: 1;
  exportedAt: string;
  tenantSlug: string;
  sourceApi: string;
  contractTypes: Array<Record<string, unknown>>;
  contractEndReasons: Array<Record<string, unknown>>;
  technicalCommitteeEmployeeIds: number[];
  /** id → caminho do arquivo no Beatscode (ex.: hash.pdf) — preenchido com BEATSCODE_DATABASE_URL no export */
  attachmentIndex?: Record<
    string,
    { storagePath: string; displayName: string; mimeType?: string }
  >;
  contracts: BeatscodeContractExportRow[];
};

export function isBeatscodeContractExportFile(
  raw: unknown,
): raw is BeatscodeContractExportFile {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.contracts);
}

export const DEFAULT_BEATSCODE_CONTRACTS_EXPORT_PATH =
  'data/beatscode-contracts-export.json';

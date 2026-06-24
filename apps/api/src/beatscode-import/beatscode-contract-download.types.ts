export type BeatscodeContractDownloadManifestFile = {
  version: 1;
  updatedAt: string;
  tenantSlug: string;
  contractsExportPath: string;
  athletesExportPath: string;
  filesDir: string;
  stats: {
    employeesTotal: number;
    employeesDone: number;
    filesDownloaded: number;
    filesSkipped: number;
    contractsLinked: number;
    errors: number;
  };
  entries: BeatscodeContractDownloadEntry[];
};

export type BeatscodeContractDownloadEntry = {
  beatscodeContractId: number;
  employeeId: number;
  playerName: string;
  athleteRecordId?: string;
  contractTypeName: string | null;
  contractNumber: string | null;
  contractStatus: string;
  contractStatusLabel: string;
  initialDate: string | null;
  finalDate: string | null;
  menuCategory: string;
  attachmentId: number;
  documentName: string;
  localFilePath: string;
  fileSize: number;
  downloadedAt: string;
  source: 'browser_sniff' | 'browser_ui' | 'api' | 'export_snapshot';
};

export const DEFAULT_CONTRACTS_DOWNLOAD_DIR = 'data/beatscode-contracts-download';
export const DEFAULT_CONTRACTS_MANIFEST_PATH =
  'data/beatscode-contracts-download/manifest.json';

export function isBeatscodeContractDownloadManifest(
  raw: unknown,
): raw is BeatscodeContractDownloadManifestFile {
  if (!raw || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.entries);
}

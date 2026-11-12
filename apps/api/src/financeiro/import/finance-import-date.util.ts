export type FinanceImportDateKind =
  | 'issue'
  | 'due'
  | 'scheduled'
  | 'settlement'
  | 'extract'
  | 'competence';

export function parseSpreadsheetDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (/^n\/d$/i.test(String(v).trim())) return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }

  if (typeof v === 'number' && Number.isFinite(v)) {
    return excelSerialToIso(v);
  }

  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = br[1].padStart(2, '0');
    const m = br[2].padStart(2, '0');
    return `${br[3]}-${m}-${d}`;
  }

  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum > 20000 && asNum < 60000) {
    return excelSerialToIso(asNum);
  }

  return null;
}

/** Excel 1900 date system (adequado para planilhas Omie/export). */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serial) * 86_400_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

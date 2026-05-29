/** Decodifica respostas compactadas da API Beatscode (portado do front-end). */
export function decodeBeatscodeShortContent<T = unknown>(input: unknown): T {
  let data = input as Record<string, unknown> | unknown[] | null;

  if (data && typeof data === 'object' && !Array.isArray(data) && data.linkShortContent) {
    const link = data.linkShortContent;
    if (typeof link === 'string') {
      (data as Record<string, unknown>)[link] = decodeBeatscodeShortContent(
        (data as Record<string, unknown>)[link],
      );
    } else if (Array.isArray(link)) {
      for (const key of link) {
        (data as Record<string, unknown>)[key] = decodeBeatscodeShortContent(
          (data as Record<string, unknown>)[key],
        );
      }
    }
    delete (data as Record<string, unknown>).linkShortContent;
  }

  if (!data || typeof data !== 'object' || !('shortContent' in (data as object))) {
    return data as T;
  }

  const sc = (data as { shortContent: unknown }).shortContent as unknown[];
  if (!Array.isArray(sc)) return data as T;

  if (sc.length === 2) {
    const [keys, rows] = sc as [Record<string, string>, Record<string, Record<string, unknown>>];
    for (const rowKey in rows) {
      const mapped: Record<string, unknown> = {};
      for (const colKey in keys) {
        mapped[keys[colKey]!] = rows[rowKey]![colKey];
      }
      rows[rowKey] = mapped;
    }
    return rows as T;
  }

  const [keys, rows, dictFlags, dictValues] = sc as [
    Record<string, string>,
    Record<string, Record<string, unknown>>,
    Record<string, boolean>,
    Record<string, unknown>,
  ];

  const useDict: Record<string, boolean> = {};
  for (const k in dictFlags) {
    const field = String(dictFlags[k]);
    useDict[field] = true;
  }

  for (const rowKey in rows) {
    const mapped: Record<string, unknown> = {};
    for (const colKey in keys) {
      const field = keys[colKey]!;
      const raw = rows[rowKey]![colKey];
      mapped[field] = useDict[field] ? dictValues[raw as string] : raw;
    }
    rows[rowKey] = mapped;
  }

  return rows as T;
}

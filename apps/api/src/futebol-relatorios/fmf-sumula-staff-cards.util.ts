import { PDFParse } from 'pdf-parse';
import {
  parseFmfMatchReportText,
  type FmfStaffCardEvent,
} from '../fmf-scraper/fmf-match-report.parser';

const urlCache = new Map<string, Promise<FmfStaffCardEvent[]>>();

/** Reimporta cartões da comissão direto do PDF FMF (súmulas gravadas antes da correção). */
export async function fetchStaffCardEventsFromSumulaUrl(
  sourceUrl: string,
): Promise<FmfStaffCardEvent[]> {
  const url = sourceUrl.trim();
  if (!url) return [];

  let pending = urlCache.get(url);
  if (!pending) {
    pending = (async () => {
      const parser = new PDFParse({ url });
      try {
        const result = await parser.getText();
        return parseFmfMatchReportText(result.text).staffCardEvents;
      } catch {
        return [];
      } finally {
        await parser.destroy();
      }
    })();
    urlCache.set(url, pending);
  }

  return pending;
}

import { Injectable, Logger } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium, type Browser, type Download, type Page } from 'playwright';
import { BeatscodeApiClient } from './beatscode-api.client';
import { mapBeatscodeDocumentTypeLabel } from './beatscode-document.types';
import { resolveBeatscodeApiUrl, resolveBeatscodeWebUrl } from './beatscode-browser.util';

export type BeatscodeScrapedDocument = {
  name: string;
  documentType: string;
  documentCategory: 'pessoal' | 'contrato' | 'medico' | 'outro';
  rowKey?: string;
  storagePath: string;
  buffer: Buffer;
  uploadedAt?: string;
  tab: string;
};

export type BeatscodeBrowserScrapeResult = {
  employeeId?: number;
  playerName: string;
  documents: BeatscodeScrapedDocument[];
  errors: string[];
};

@Injectable()
export class BeatscodeBrowserScraperService {
  private readonly log = new Logger(BeatscodeBrowserScraperService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;
  private tempDir: string | null = null;
  private cachedCategories: string[] | null = null;

  hasCredentials(): boolean {
    return Boolean(
      process.env.BEATSCODE_USERNAME?.trim() && process.env.BEATSCODE_PASSWORD?.trim(),
    );
  }

  async close(): Promise<void> {
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
    this.page = null;
    this.cachedCategories = null;
    if (this.tempDir) {
      await rm(this.tempDir, { recursive: true, force: true }).catch(() => undefined);
      this.tempDir = null;
    }
  }

  async ensurePage(headed = process.env.BEATSCODE_HEADED === '1'): Promise<Page> {
    if (this.page) return this.page;
    this.tempDir = await mkdtemp(join(tmpdir(), 'bcg-beatscode-'));
    this.browser = await chromium.launch({
      headless: !headed,
      slowMo: headed ? 60 : 0,
    });
    this.page = await this.browser.newPage();
    await this.login(this.page);
    return this.page;
  }

  /** Abre atleta/comissão pelo nome e baixa PDFs das abas Documentos/Anexos/Contrato. */
  async scrapePersonDocuments(options: {
    playerName: string;
    employeeId?: number;
    modulePath?: '/person/athlete' | '/person/technical-committee';
    categoryNames?: string[];
  }): Promise<BeatscodeBrowserScrapeResult> {
    const modulePath = options.modulePath ?? '/person/athlete';
    const categories = options.categoryNames?.length
      ? options.categoryNames
      : await this.loadCategoryNames(modulePath);

    const page = await this.ensurePage();
    const result: BeatscodeBrowserScrapeResult = {
      employeeId: options.employeeId,
      playerName: options.playerName,
      documents: [],
      errors: [],
    };

    let opened = false;
    await page.goto(`${resolveBeatscodeWebUrl()}${modulePath}`, {
      waitUntil: 'load',
      timeout: 120_000,
    });
    await page.waitForSelector('.card-people', { timeout: 60_000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
    if (await this.openPersonCard(page, options.playerName)) {
      opened = true;
    } else {
      const cardCount = await page.locator('.card-people').count();
      if (cardCount === 0 && (await this.openPersonViaSearch(page, options.playerName))) {
        opened = true;
      }
    }

    if (!opened) {
      for (const category of categories) {
        try {
          await page.goto(`${resolveBeatscodeWebUrl()}${modulePath}`, {
            waitUntil: 'load',
            timeout: 120_000,
          });
          await page.waitForSelector('.card-people', { timeout: 60_000 }).catch(() => undefined);
          await page.waitForTimeout(2000);
          await this.selectCategory(page, category);
          if (await this.openPersonCard(page, options.playerName)) {
            opened = true;
            break;
          }
          const cardCount = await page.locator('.card-people').count();
          if (cardCount === 0 && (await this.openPersonViaSearch(page, options.playerName))) {
            opened = true;
            break;
          }
        } catch (e) {
          result.errors.push(
            `${category}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }

    if (!opened) {
      result.errors.push(`Não encontrado no painel: ${options.playerName}`);
      return result;
    }

    for (const tab of ['Documentos', 'Anexos', 'Contrato']) {
      try {
        const docs = await this.scrapeDocumentsTab(page, tab);
        result.documents.push(...docs);
      } catch (e) {
        result.errors.push(
          `${tab}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    return result;
  }

  private async login(page: Page): Promise<void> {
    await page.goto(`${resolveBeatscodeWebUrl()}/signin`, {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });
    if (!page.url().includes('signin')) return;
    await page.locator('#username').fill(process.env.BEATSCODE_USERNAME!.trim());
    await page.locator('#password').fill(process.env.BEATSCODE_PASSWORD!.trim());
    await page.locator('input.signin-btn[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('signin'), { timeout: 60_000 });
    await page.waitForTimeout(1500);
  }

  private async loadCategoryNames(
    route: '/person/athlete' | '/person/technical-committee',
  ): Promise<string[]> {
    if (this.cachedCategories?.length) return this.cachedCategories;
    try {
      const client = new BeatscodeApiClient(
        resolveBeatscodeApiUrl(),
        process.env.BEATSCODE_USERNAME!.trim(),
        process.env.BEATSCODE_PASSWORD!.trim(),
      );
      await client.login();
      const init = await client.fetchInitialData(route);
      this.cachedCategories = init.categories.map((c) => c.name).filter(Boolean);
      return this.cachedCategories;
    } catch {
      this.cachedCategories = ['Sub 20', 'Sub 17', 'Sub 15', 'Sub 14', 'Sub 13'];
      return this.cachedCategories;
    }
  }

  private async selectCategory(page: Page, categoryName: string): Promise<void> {
    const btn = page.locator('button[title="Categorias"]').first();
    if (!(await btn.isVisible().catch(() => false))) return;
    await btn.click();
    await page.waitForTimeout(600);
    const option = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: categoryName })
      .first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await page.waitForTimeout(2500);
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }

  private normalizeName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private nameMatchesPanel(target: string, panelName: string): boolean {
    const norm = this.normalizeName(panelName);
    const targetTokens = target.split(' ').filter((t) => t.length > 2);
    if (!targetTokens.length) return norm.includes(target);
    const matched = targetTokens.filter((t) => norm.includes(t)).length;
    const minMatch = Math.min(2, targetTokens.length);
    return (
      norm === target ||
      matched >= minMatch ||
      (targetTokens[0] ? norm.startsWith(targetTokens[0]) : false)
    );
  }

  private async openPersonCard(page: Page, playerName: string): Promise<boolean> {
    await page.waitForSelector('.card-people', { timeout: 30_000 }).catch(() => null);
    const target = this.normalizeName(playerName);
    const cards = page.locator('.card-people');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      const name = await cards
        .nth(i)
        .locator('.title-session span')
        .innerText()
        .catch(() => '');
      if (!this.nameMatchesPanel(target, name)) continue;
      await cards.nth(i).click();
      await page.waitForTimeout(3000);
      return true;
    }
    return false;
  }

  /** Fallback: modal "Procurar Pessoa" no header do Beatscode. */
  private async openPersonViaSearch(page: Page, playerName: string): Promise<boolean> {
    const searchBtn = page.locator('[aria-label="search-person-modal"]').first();
    if (!(await searchBtn.isVisible().catch(() => false))) return false;

    const tokens = playerName.trim().split(/\s+/).filter(Boolean);
    const queries = [
      tokens.slice(0, 2).join(' '),
      tokens[0] ?? playerName,
      playerName,
    ].filter((q, i, arr) => q && arr.indexOf(q) === i);

    for (const query of queries) {
      await searchBtn.click();
      await page.waitForTimeout(1500);

      const input = page.locator('input[placeholder*="Fulano"], input[placeholder*="Silva"]').first();
      if (!(await input.isVisible().catch(() => false))) {
        await page.keyboard.press('Escape').catch(() => undefined);
        continue;
      }
      await input.fill(query);
      await page.waitForTimeout(2500);

      const modalRows = page.locator('.ant-modal .ant-table-row, .ant-modal tbody tr');
      const rowCount = await modalRows.count();
      const target = this.normalizeName(playerName);
      const tokens = playerName.trim().split(/\s+/).filter(Boolean);

      for (let i = 0; i < rowCount; i++) {
        const text = (await modalRows.nth(i).innerText().catch(() => '')) || '';
        const ok = this.nameMatchesPanel(target, text);
        if (!ok && rowCount > 1) continue;
        await modalRows.nth(i).click();
        await page.waitForTimeout(3500);
        await page.keyboard.press('Escape').catch(() => undefined);
        return true;
      }

      if (rowCount === 1) {
        await modalRows.first().click();
        await page.waitForTimeout(3500);
        await page.keyboard.press('Escape').catch(() => undefined);
        return true;
      }

      await page.keyboard.press('Escape').catch(() => undefined);
    }

    return false;
  }

  private async scrapeDocumentsTab(
    page: Page,
    tabLabel: string,
  ): Promise<BeatscodeScrapedDocument[]> {
    const tab = page.getByText(tabLabel, { exact: true }).first();
    if (!(await tab.isVisible().catch(() => false))) return [];
    await tab.click();
    await page.waitForTimeout(2500);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    const docs: BeatscodeScrapedDocument[] = [];

    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i);
      const cells = await row.locator('td').allInnerTexts();
      const date = (cells[0] ?? '').trim();
      const name = (cells[1] ?? '').trim() || `Documento ${i + 1}`;
      const typeLabel = (cells[2] ?? '').trim();
      const rowKey = (await row.getAttribute('data-row-key')) ?? undefined;
      const mapped = mapBeatscodeDocumentTypeLabel(rowKey ?? typeLabel ?? name);
      const viewer = row.locator('svg:has-text("Visualizar Anexo")').first();
      if (!(await viewer.isVisible().catch(() => false))) continue;

      const download = await this.clickAndDownload(page, viewer);
      if (!download) continue;

      const buffer = await this.readDownload(download);
      const filename = download.suggestedFilename() || `documento-${i + 1}.pdf`;
      const hash = filename.replace(/\.[^.]+$/, '');
      docs.push({
        name,
        documentType: rowKey && rowKey.length <= 32 ? rowKey : mapped.documentType,
        documentCategory:
          tabLabel === 'Contrato' ? 'contrato' : mapped.documentCategory,
        rowKey,
        storagePath: `files/${hash}.pdf`,
        buffer,
        uploadedAt: this.parseBrDate(date),
        tab: tabLabel,
      });
    }

    return docs;
  }

  private async clickAndDownload(
    page: Page,
    locator: ReturnType<Page['locator']>,
  ): Promise<Download | null> {
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        locator.click({ force: true }),
      ]);
      return download;
    } catch {
      return null;
    }
  }

  private async readDownload(download: Download): Promise<Buffer> {
    const filename = download.suggestedFilename() || `${Date.now()}.pdf`;
    const target = join(this.tempDir!, filename);
    await download.saveAs(target);
    return readFile(target);
  }

  private parseBrDate(raw: string): string | undefined {
    const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (!m) return undefined;
    const [, dd, mm, yyyy, hh = '12', min = '00'] = m;
    const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
}

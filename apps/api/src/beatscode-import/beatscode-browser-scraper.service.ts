import { Injectable, Logger } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { chromium, type Browser, type Download, type Page, type Response } from 'playwright';
import { BeatscodeApiClient } from './beatscode-api.client';
import { mapBeatscodeDocumentTypeLabel } from './beatscode-document.types';
import {
  extractAllAttachmentsFromJson,
  resolveBeatscodeApiUrl,
  resolveBeatscodeWebUrl,
  type BeatscodeSniffedAttachment,
} from './beatscode-browser.util';

const DEFAULT_PLAYER_TIMEOUT_MS = 240_000;
const DEFAULT_TAB_TIMEOUT_MS = 25_000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 12_000;
const DEFAULT_DOWNLOAD_CONCURRENCY = 6;
/** Beatscode costuma derrubar sessão web/API após ~10 min — renovar antes disso. */
const DEFAULT_SESSION_MAX_MS = 9 * 60 * 1000;

export type BeatscodeScrapedDocument = {
  name: string;
  documentType: string;
  documentCategory: 'pessoal' | 'contrato' | 'medico' | 'outro';
  rowKey?: string;
  storagePath: string;
  buffer: Buffer;
  uploadedAt?: string;
  tab: string;
  attachmentId?: number;
  contractNumber?: string;
  contractTypeName?: string;
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
  private apiClient: BeatscodeApiClient | null = null;
  private sniffedByTab = new Map<string, BeatscodeSniffedAttachment[]>();
  private responseHandler: ((res: Response) => void) | null = null;
  private playersSinceLaunch = 0;
  private sessionStartedAt: number | null = null;

  hasCredentials(): boolean {
    return Boolean(
      process.env.BEATSCODE_USERNAME?.trim() && process.env.BEATSCODE_PASSWORD?.trim(),
    );
  }

  async close(): Promise<void> {
    await this.detachSniffer();
    await this.browser?.close().catch(() => undefined);
    this.browser = null;
    this.page = null;
    this.apiClient = null;
    this.cachedCategories = null;
    this.sniffedByTab.clear();
    this.playersSinceLaunch = 0;
    this.sessionStartedAt = null;
    if (this.tempDir) {
      await rm(this.tempDir, { recursive: true, force: true }).catch(() => undefined);
      this.tempDir = null;
    }
  }

  /** Reinicia navegador (sessão expirada, timeout ou ciclo programado). */
  async resetSession(reason?: string): Promise<void> {
    this.log.warn(
      `Beatscode browser: reiniciando sessão Playwright${reason ? ` — ${reason}` : ''}`,
    );
    await this.close();
  }

  private sessionMaxMs(): number {
    const raw = process.env.BEATSCODE_BROWSER_SESSION_MAX_MS;
    if (raw === '0') return 0;
    return Number(raw ?? DEFAULT_SESSION_MAX_MS);
  }

  private markSessionFresh(): void {
    this.sessionStartedAt = Date.now();
  }

  private isSessionAgeExceeded(): boolean {
    const max = this.sessionMaxMs();
    if (max <= 0 || this.sessionStartedAt == null) return false;
    return Date.now() - this.sessionStartedAt >= max;
  }

  /** Garante login web se o painel redirecionou para /signin. */
  private async ensureWebSessionAlive(page: Page): Promise<void> {
    if (!page.url().includes('signin')) return;
    this.log.warn('Beatscode: sessão web expirou — fazendo login de novo');
    await this.login(page);
    this.apiClient = null;
  }

  private playerTimeoutMs(): number {
    return Number(process.env.BEATSCODE_BROWSER_PLAYER_TIMEOUT_MS ?? DEFAULT_PLAYER_TIMEOUT_MS);
  }

  private recycleEvery(): number {
    return Number(process.env.BEATSCODE_BROWSER_RECYCLE_EVERY ?? 40);
  }

  private isFastMode(): boolean {
    return process.env.BEATSCODE_BROWSER_FAST !== '0';
  }

  private pauseMs(slow: number, fast: number): number {
    return this.isFastMode() ? fast : slow;
  }

  /**
   * Renova sessão antes de cada atleta se passou o tempo limite (~9 min) ou N atletas.
   * @returns true se o browser foi reiniciado (relogue API Beatscode no caller).
   */
  async beforePlayerScrape(): Promise<boolean> {
    let recycled = false;

    if (this.isSessionAgeExceeded()) {
      const mins = Math.round(this.sessionMaxMs() / 60_000);
      await this.resetSession(`sessão Beatscode ~${mins} min`);
      recycled = true;
      this.playersSinceLaunch = 0;
    }

    this.playersSinceLaunch += 1;
    const every = this.recycleEvery();
    if (every > 0 && this.playersSinceLaunch > 1 && (this.playersSinceLaunch - 1) % every === 0) {
      await this.resetSession(`a cada ${every} atleta(s)`);
      recycled = true;
      this.playersSinceLaunch = 1;
    }

    return recycled;
  }

  private async getApiClient(): Promise<BeatscodeApiClient> {
    if (this.apiClient && this.isSessionAgeExceeded()) {
      this.apiClient = null;
    }
    if (!this.apiClient) {
      this.apiClient = new BeatscodeApiClient(
        resolveBeatscodeApiUrl(),
        process.env.BEATSCODE_USERNAME!.trim(),
        process.env.BEATSCODE_PASSWORD!.trim(),
      );
      await this.apiClient.login();
    }
    return this.apiClient;
  }

  private async detachSniffer(): Promise<void> {
    if (this.page && this.responseHandler) {
      this.page.off('response', this.responseHandler);
    }
    this.responseHandler = null;
    this.sniffedByTab.clear();
  }

  private attachSniffer(page: Page): void {
    if (this.responseHandler) return;
    this.responseHandler = (res: Response) => {
      void this.onApiResponse(res);
    };
    page.on('response', this.responseHandler);
  }

  private async onApiResponse(res: Response): Promise<void> {
    try {
      const url = res.url();
      if (!url.includes('beatscode')) return;
      const ct = res.headers()['content-type'] ?? '';
      if (!ct.includes('json')) return;
      const body = await res.text();
      const found = extractAllAttachmentsFromJson(body);
      if (!found.length) return;
      const bucket = this.sniffedByTab.get('__all__') ?? [];
      const known = new Set(bucket.map((x) => x.id));
      for (const item of found) {
        if (!known.has(item.id)) {
          bucket.push(item);
          known.add(item.id);
        }
      }
      this.sniffedByTab.set('__all__', bucket);
    } catch {
      /* ignore */
    }
  }

  private clearSniffed(): void {
    this.sniffedByTab.clear();
  }

  async ensurePage(headed = process.env.BEATSCODE_HEADED === '1'): Promise<Page> {
    if (this.page) {
      await this.ensureWebSessionAlive(this.page);
      return this.page;
    }
    this.tempDir = await mkdtemp(join(tmpdir(), 'bcg-beatscode-'));
    this.browser = await chromium.launch({
      headless: !headed,
      slowMo: headed ? 60 : 0,
    });
    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(30_000);
    this.page.setDefaultNavigationTimeout(60_000);
    this.attachSniffer(this.page);
    await this.login(this.page);
    this.markSessionFresh();
    return this.page;
  }

  /** Abre atleta/comissão pelo nome e baixa PDFs das abas Documentos/Anexos/Contrato. */
  async scrapePersonDocuments(options: {
    playerName: string;
    employeeId?: number;
    athleteRecordId?: string | number;
    aliasNames?: string[];
    modulePath?: '/person/athlete' | '/person/technical-committee';
    categoryNames?: string[];
    tabs?: Array<'Documentos' | 'Anexos' | 'Contrato'>;
  }): Promise<BeatscodeBrowserScrapeResult> {
    return this.withTimeout(
      () => this.scrapePersonDocumentsInner(options),
      this.playerTimeoutMs(),
      `atleta ${options.playerName}`,
    );
  }

  private async scrapePersonDocumentsInner(options: {
    playerName: string;
    employeeId?: number;
    athleteRecordId?: string | number;
    aliasNames?: string[];
    modulePath?: '/person/athlete' | '/person/technical-committee';
    categoryNames?: string[];
    tabs?: Array<'Documentos' | 'Anexos' | 'Contrato'>;
  }): Promise<BeatscodeBrowserScrapeResult> {
    const modulePath = options.modulePath ?? '/person/athlete';
    const categories = options.categoryNames?.length
      ? options.categoryNames
      : await this.loadCategoryNames(modulePath);

    const page = await this.ensurePage();
    await this.ensureWebSessionAlive(page);
    this.clearSniffed();
    const result: BeatscodeBrowserScrapeResult = {
      employeeId: options.employeeId,
      playerName: options.playerName,
      documents: [],
      errors: [],
    };

    const searchNames = this.buildSearchNameList(
      options.playerName,
      options.aliasNames,
    );

    let opened = false;
    if (options.employeeId || options.athleteRecordId) {
      opened = await this.openPersonByDirectUrl(
        page,
        modulePath,
        options.employeeId,
        options.athleteRecordId,
      );
    }

    if (!opened) {
      await page.goto(`${resolveBeatscodeWebUrl()}${modulePath}`, {
        waitUntil: 'load',
        timeout: 120_000,
      });
      await this.ensureWebSessionAlive(page);
      await page.waitForSelector('.card-people', { timeout: 60_000 }).catch(() => undefined);
      await page.waitForTimeout(this.pauseMs(2000, 700));

      for (const name of searchNames) {
        if (await this.openPersonCard(page, name)) {
          opened = true;
          break;
        }
        const cardCount = await page.locator('.card-people').count();
        if (cardCount === 0 && (await this.openPersonViaSearch(page, name))) {
          opened = true;
          break;
        }
      }
    }

    if (!opened && !options.employeeId && !options.athleteRecordId) {
      for (const category of categories) {
        try {
          await page.goto(`${resolveBeatscodeWebUrl()}${modulePath}`, {
            waitUntil: 'load',
            timeout: 120_000,
          });
          await this.ensureWebSessionAlive(page);
          await page.waitForSelector('.card-people', { timeout: 60_000 }).catch(() => undefined);
          await page.waitForTimeout(2000);
          await this.selectCategory(page, category);
          for (const name of searchNames) {
            if (await this.openPersonCard(page, name)) {
              opened = true;
              break;
            }
            const cardCount = await page.locator('.card-people').count();
            if (cardCount === 0 && (await this.openPersonViaSearch(page, name))) {
              opened = true;
              break;
            }
          }
          if (opened) break;
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

    const tabs = options.tabs?.length
      ? options.tabs
      : (['Documentos', 'Anexos', 'Contrato'] as const);
    for (const tab of tabs) {
      const sniffedCount = (this.sniffedByTab.get('__all__') ?? []).length;
      if (sniffedCount > 0 && tab !== 'Documentos') break;
      try {
        await this.withTimeout(
          () => this.activateDocumentsTab(page, tab),
          DEFAULT_TAB_TIMEOUT_MS,
          `aba ${tab}`,
        );
      } catch (e) {
        result.errors.push(
          `${tab}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const sniffed = this.sniffedByTab.get('__all__') ?? [];
    if (sniffed.length) {
      const apiDocs = await this.downloadSniffedAttachments(sniffed, tabs[0]);
      result.documents.push(...apiDocs);
      this.log.log(
        `${options.playerName}: ${apiDocs.length} PDF(s) via API (${sniffed.length} anexo(s) na rede)`,
      );
    }

    if (!result.documents.length) {
      for (const tab of tabs) {
        try {
          const docs = await this.withTimeout(
            () => this.scrapeDocumentsTab(page, tab),
            DEFAULT_TAB_TIMEOUT_MS,
            `download UI ${tab}`,
          );
          result.documents.push(...docs);
          if (docs.length > 0) break;
        } catch (e) {
          result.errors.push(
            `${tab}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
    return result;
  }

  private async downloadSniffedAttachments(
    sniffed: BeatscodeSniffedAttachment[],
    defaultTab: string,
  ): Promise<BeatscodeScrapedDocument[]> {
    const client = await this.getApiClient();
    const concurrency = Number(
      process.env.BEATSCODE_BROWSER_DOWNLOAD_CONCURRENCY ?? DEFAULT_DOWNLOAD_CONCURRENCY,
    );
    const docs: BeatscodeScrapedDocument[] = [];

    for (let i = 0; i < sniffed.length; i += concurrency) {
      const chunk = sniffed.slice(i, i + concurrency);
      const batch = await Promise.all(
        chunk.map(async (meta) => {
          try {
            const buf = await client.downloadFile(meta.storagePath);
            if (!buf?.length) return null;
            const mapped = mapBeatscodeDocumentTypeLabel(meta.displayName);
            return {
              name:
                meta.displayName.replace(/\.(pdf|png|jpe?g|webp)$/i, '').trim() ||
                meta.displayName,
              documentType: mapped.documentType,
              documentCategory: mapped.documentCategory,
              storagePath: meta.storagePath.replace(/^\/+/, ''),
              buffer: buf,
              tab: defaultTab,
              attachmentId: meta.id,
            } satisfies BeatscodeScrapedDocument;
          } catch (e) {
            this.log.warn(
              `Download API ${meta.id} falhou: ${e instanceof Error ? e.message : e}`,
            );
            return null;
          }
        }),
      );
      for (const doc of batch) {
        if (doc) docs.push(doc);
      }
    }
    return docs;
  }

  private async withTimeout<T>(
    fn: () => Promise<T>,
    ms: number,
    label: string,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Timeout (${Math.round(ms / 1000)}s): ${label}`)),
            ms,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async activateDocumentsTab(page: Page, tabLabel: string): Promise<void> {
    const tab = page.getByText(tabLabel, { exact: true }).first();
    if (!(await tab.isVisible().catch(() => false))) return;
    await tab.click();
    await page.waitForTimeout(this.pauseMs(900, 350));
    await page
      .waitForLoadState('networkidle', { timeout: this.pauseMs(8_000, 4_000) })
      .catch(() => undefined);
  }

  private async login(page: Page): Promise<void> {
    await page.goto(`${resolveBeatscodeWebUrl()}/signin`, {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });
    if (!page.url().includes('signin')) {
      this.markSessionFresh();
      return;
    }
    await page.locator('#username').fill(process.env.BEATSCODE_USERNAME!.trim());
    await page.locator('#password').fill(process.env.BEATSCODE_PASSWORD!.trim());
    // Beatscode migrou o botão de <input> para <button> (Ant Design). Aceita ambos
    // e, como fallback, submete o formulário com Enter no campo de senha.
    const submitBtn = page
      .locator(
        'button.signin-btn[type="submit"], input.signin-btn[type="submit"], button[type="submit"]',
      )
      .first();
    if (await submitBtn.count().catch(() => 0)) {
      await submitBtn.click();
    } else {
      await page.locator('#password').press('Enter');
    }
    await page.waitForURL((url) => !url.pathname.includes('signin'), { timeout: 60_000 });
    await page.waitForTimeout(800);
    this.markSessionFresh();
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
    await page.waitForTimeout(400);
    const option = page
      .locator('.ant-select-dropdown:visible .ant-select-item-option-content')
      .filter({ hasText: categoryName })
      .first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
      await page.waitForTimeout(1200);
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }

  private buildSearchNameList(primary: string, aliases?: string[]): string[] {
    const out: string[] = [];
    const push = (v: string) => {
      const t = v.trim();
      if (!t) return;
      if (!out.some((x) => this.normalizeName(x) === this.normalizeName(t))) out.push(t);
    };
    push(primary);
    for (const a of aliases ?? []) push(a);
    const tokens = primary.trim().split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      push(tokens.slice(-2).join(' '));
      push(tokens[tokens.length - 1]!);
      push(`${tokens[0]} ${tokens[tokens.length - 1]}`);
    }
    return out;
  }

  /** URL direta do cadastro — evita depender só do match por nome nos cards. */
  private async openPersonByDirectUrl(
    page: Page,
    modulePath: '/person/athlete' | '/person/technical-committee',
    employeeId?: number,
    athleteRecordId?: string | number,
  ): Promise<boolean> {
    const ids = [
      athleteRecordId != null && String(athleteRecordId).trim()
        ? String(athleteRecordId).trim()
        : null,
      employeeId != null && Number.isFinite(employeeId) ? String(employeeId) : null,
    ].filter((v, i, arr): v is string => Boolean(v) && arr.indexOf(v) === i);

    for (const id of ids) {
      const url = `${resolveBeatscodeWebUrl()}${modulePath}/id/${id}`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 45_000 });
        await this.ensureWebSessionAlive(page);
        await page.waitForTimeout(this.pauseMs(1000, 450));
        const onPerson =
          page.url().includes(`${modulePath}/id/`) ||
          (await page.getByText('Documentos', { exact: true }).first().isVisible().catch(() => false));
        if (onPerson) {
          this.log.log(`Abriu por URL direta: ${url}`);
          return true;
        }
      } catch (e) {
        this.log.warn(`URL direta falhou ${url}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return false;
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
    if (!norm || !target) return false;
    if (norm === target) return true;

    const targetTokens = target.split(' ').filter((t) => t.length > 1);
    const panelTokens = norm.split(' ').filter((t) => t.length > 1);
    if (!targetTokens.length) return norm.includes(target);

    const matched = targetTokens.filter((t) => norm.includes(t)).length;
    const minMatch = Math.max(2, Math.min(targetTokens.length, 3));
    if (matched >= minMatch) return true;

    const targetLast = targetTokens[targetTokens.length - 1];
    const targetFirst = targetTokens[0];
    if (targetLast && panelTokens.includes(targetLast) && targetFirst && norm.includes(targetFirst)) {
      return true;
    }
    if (targetLast && panelTokens.includes(targetLast) && targetTokens.length >= 2) {
      return panelTokens.filter((t) => targetTokens.includes(t)).length >= 2;
    }
    return targetFirst ? norm.startsWith(targetFirst) && matched >= 1 : false;
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
      await page.waitForTimeout(this.pauseMs(1500, 500));
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
      tokens.slice(-2).join(' '),
      tokens[tokens.length - 1] ?? '',
      tokens.slice(0, 2).join(' '),
      tokens[0] ?? playerName,
      playerName,
    ].filter((q, i, arr) => q && arr.indexOf(q) === i);

    for (const query of queries) {
      await searchBtn.click();
      await page.waitForTimeout(800);

      const input = page.locator('input[placeholder*="Fulano"], input[placeholder*="Silva"]').first();
      if (!(await input.isVisible().catch(() => false))) {
        await page.keyboard.press('Escape').catch(() => undefined);
        continue;
      }
      await input.fill(query);
      await page.waitForTimeout(1500);

      const modalRows = page.locator('.ant-modal .ant-table-row, .ant-modal tbody tr');
      const rowCount = await modalRows.count();
      const target = this.normalizeName(playerName);

      let bestIdx = -1;
      let bestScore = 0;
      for (let i = 0; i < rowCount; i++) {
        const text = (await modalRows.nth(i).innerText().catch(() => '')) || '';
        if (!this.nameMatchesPanel(target, text)) continue;
        const score = text.split(/\s+/).filter(Boolean).length;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        await modalRows.nth(bestIdx).click();
        await page.waitForTimeout(1500);
        await page.keyboard.press('Escape').catch(() => undefined);
        return true;
      }

      if (rowCount === 1) {
        await modalRows.first().click();
        await page.waitForTimeout(1500);
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
    await page.waitForTimeout(this.pauseMs(900, 350));

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
        contractTypeName: tabLabel === 'Contrato' ? typeLabel || undefined : undefined,
        contractNumber:
          tabLabel === 'Contrato' && name && !/^documento \d+$/i.test(name) ? name : undefined,
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
        page.waitForEvent('download', { timeout: DEFAULT_DOWNLOAD_TIMEOUT_MS }),
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

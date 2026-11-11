import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { chromium, type Browser } from 'playwright';

@Injectable()
export class AthleteContractPdfService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium.launch({ headless: true }).catch((err) => {
        this.browserPromise = null;
        throw err;
      });
    }
    return this.browserPromise;
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    let page: Awaited<ReturnType<Browser['newPage']>> | null = null;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
      const pdf = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdf);
    } catch {
      throw new ServiceUnavailableException('Não foi possível gerar o PDF do dossiê contratual.');
    } finally {
      await page?.close().catch(() => undefined);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const b = await this.browserPromise.catch(() => null);
      await b?.close().catch(() => undefined);
      this.browserPromise = null;
    }
  }
}

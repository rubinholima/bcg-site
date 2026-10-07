import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { chromium, type Browser } from 'playwright';
import type { VenueProposalDto } from './boston-city-hall.constants';
import { buildVenueProposalPrintHtml } from './boston-city-hall-proposal-print.util';

@Injectable()
export class BostonCityHallProposalPdfService implements OnModuleDestroy {
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
      page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
      });
      return Buffer.from(pdf);
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível gerar o PDF da proposta no momento.',
      );
    } finally {
      await page?.close().catch(() => undefined);
    }
  }

  async renderProposalPdf(proposal: VenueProposalDto): Promise<Buffer> {
    const html = buildVenueProposalPrintHtml(proposal);
    return this.renderHtmlToPdf(html);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const b = await this.browserPromise.catch(() => null);
      await b?.close().catch(() => undefined);
      this.browserPromise = null;
    }
  }
}

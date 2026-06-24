import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { isBeatscodeExportFile } from './beatscode-export.types';
import { BeatscodeImportService, resolveBeatscodeTenantSlug } from './beatscode-import.service';
import { BeatscodeAgendaImportService } from './beatscode-agenda-import.service';
import { BeatscodeContractImportService } from './beatscode-contract-import.service';
import { BeatscodeDocumentsImportService } from './beatscode-documents-import.service';
import { isBeatscodeContractExportFile } from './beatscode-contract-export.types';
import { isBeatscodeAgendaExportFile } from './beatscode-agenda-export.types';

@Controller('api/beatscode-import')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('fmf_scraper')
export class BeatscodeImportController {
  constructor(
    private readonly beatscodeImport: BeatscodeImportService,
    private readonly beatscodeAgendaImport: BeatscodeAgendaImportService,
    private readonly beatscodeContractImport: BeatscodeContractImportService,
    private readonly beatscodeDocumentsImport: BeatscodeDocumentsImportService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  async status() {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: 'beatscode_import_last' },
    });
    return {
      credentialsConfigured: this.beatscodeImport.hasBeatscodeCredentials(),
      apiUrl: process.env.BEATSCODE_API_URL?.trim() || 'https://bostoncityfc-api.beatscode.com',
      tenantSlug: resolveBeatscodeTenantSlug(),
      lastImport: row?.config ?? null,
      /** Fluxo recomendado: export local → JSON → import na produção (sem credenciais). */
      recommendedFlow: 'export_local_json_then_import_production',
    };
  }

  /** Direto da API (local, exige credenciais no .env). */
  @Post('run')
  async run(
    @Body()
    body: {
      tenantSlug?: string;
      categoryKeys?: string[];
      downloadPhotos?: boolean;
    },
  ) {
    const result = await this.beatscodeImport.runImport({
      tenantSlug: body?.tenantSlug,
      categoryKeys: body?.categoryKeys,
      downloadPhotos: body?.downloadPhotos,
    });
    return { ok: true, ...result };
  }

  /** Importa JSON exportado — produção, sem credenciais Beatscode. */
  @Post('import-export')
  async importExport(
    @Body()
    body: {
      export?: unknown;
      tenantSlug?: string;
    },
  ) {
    if (!body?.export || !isBeatscodeExportFile(body.export)) {
      throw new BadRequestException(
        'Envie um JSON de export válido (version: 1, athletes[], tenantSlug).',
      );
    }
    const result = await this.beatscodeImport.importFromExport(body.export, {
      tenantSlug: body.tenantSlug,
    });
    return { ok: true, ...result };
  }

  @Get('agenda/status')
  async agendaStatus() {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: 'beatscode_agenda_import_last' },
    });
    return {
      tenantSlug: resolveBeatscodeTenantSlug(),
      lastImport: row?.config ?? null,
    };
  }

  /** Importa agenda/logística a partir do JSON exportado. */
  @Post('import-agenda-export')
  async importAgendaExport(
    @Body()
    body: {
      export?: unknown;
      tenantSlug?: string;
    },
  ) {
    if (!body?.export || !isBeatscodeAgendaExportFile(body.export)) {
      throw new BadRequestException(
        'Envie um JSON de export válido (version: 1, scheduleItems[], tenantSlug).',
      );
    }
    const result = await this.beatscodeAgendaImport.importFromExport(body.export, {
      tenantSlug: body.tenantSlug,
    });
    return { ok: true, ...result };
  }

  /** Agenda direto da API (local, exige credenciais). */
  @Post('run-agenda')
  async runAgenda(@Body() body: { tenantSlug?: string }) {
    const result = await this.beatscodeAgendaImport.runImport({
      tenantSlug: body?.tenantSlug,
    });
    return { ok: true, ...result };
  }

  @Get('contracts/status')
  async contractsStatus() {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: 'beatscode_contracts_import_last' },
    });
    return {
      credentialsConfigured: this.beatscodeImport.hasBeatscodeCredentials(),
      tenantSlug: resolveBeatscodeTenantSlug(),
      lastImport: row?.config ?? null,
    };
  }

  @Post('export-contracts')
  async exportContracts(@Body() body: { tenantSlug?: string }) {
    const { filePath, export: data } = await this.beatscodeContractImport.exportToFile({
      tenantSlug: body?.tenantSlug,
    });
    return { ok: true, filePath, contracts: data.contracts.length };
  }

  @Post('import-contracts-export')
  async importContractsExport(
    @Body() body: { export?: unknown; tenantSlug?: string },
  ) {
    if (!body?.export || !isBeatscodeContractExportFile(body.export)) {
      throw new BadRequestException(
        'Envie um JSON de export válido (version: 1, contracts[], tenantSlug).',
      );
    }
    const result = await this.beatscodeContractImport.importFromExport(body.export, {
      tenantSlug: body.tenantSlug,
    });
    return { ok: true, ...result };
  }

  @Post('run-contracts')
  async runContracts(@Body() body: { tenantSlug?: string }) {
    const result = await this.beatscodeContractImport.importFromApi({
      tenantSlug: body?.tenantSlug,
    });
    return { ok: true, ...result };
  }

  /** PDFs já no S3 (staging) → legal/ + LegalDocument + profile (produção, sem SCP). */
  @Post('import-contracts-manifest-s3')
  async importContractsManifestS3(
    @Body()
    body: {
      tenantSlug?: string;
      s3StagingPrefix?: string;
      dryRun?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = body?.limit ?? 40;
    const offset = body?.offset ?? 0;
    const result = await this.beatscodeContractImport.importFromDownloadManifest({
      tenantSlug: body?.tenantSlug,
      filesSource: 's3',
      s3StagingPrefix: body?.s3StagingPrefix,
      dryRun: body?.dryRun,
      limit,
      offset,
    });
    return { ok: true, ...result };
  }

  @Get('documents/status')
  async documentsStatus() {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: 'beatscode_documents_sync_last' },
    });
    return {
      apiCredentialsConfigured: this.beatscodeImport.hasBeatscodeCredentials(),
      databaseConfigured: process.env.BEATSCODE_DATABASE_URL?.trim() ? true : false,
      browserModeDefault: !process.env.BEATSCODE_DATABASE_URL?.trim(),
      tenantSlug: resolveBeatscodeTenantSlug(),
      lastSync: row?.config ?? null,
      note: 'Sem MySQL Beatscode: usa navegador (Playwright) automaticamente. Local: pnpm beatscode:sync-documents',
    };
  }

  @Post('sync-documents')
  async syncDocuments(@Body() body: { tenantSlug?: string; useBrowser?: boolean }) {
    const result = await this.beatscodeDocumentsImport.syncTenantDocuments({
      tenantSlug: body?.tenantSlug,
      useBrowser: body?.useBrowser,
    });
    return { ok: true, ...result };
  }
}

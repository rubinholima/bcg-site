import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IntegrationItemConfig {
  spreadsheetUrl?: string;
  gid?: string;
}

export interface IntegrationConfigDto {
  timesCategorias?: IntegrationItemConfig;
  proximosJogos?: IntegrationItemConfig;
  tabelaClassificacao?: IntegrationItemConfig;
}

const INTEGRATION_KEYS = ['times_categorias', 'proximos_jogos', 'tabela_classificacao'] as const;

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retorna config de um tipo (para sync). */
  async getByType(type: string): Promise<IntegrationItemConfig | null> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: type },
    });
    if (!row || !row.config) return null;
    return row.config as IntegrationItemConfig;
  }

  /** Retorna todos os configs (superadmin). */
  async getAll(): Promise<IntegrationConfigDto> {
    const rows = await this.prisma.integrationConfig.findMany({
      where: { key: { in: [...INTEGRATION_KEYS] } },
    });
    const result: IntegrationConfigDto = {};
    for (const r of rows) {
      const cfg = r.config as IntegrationItemConfig;
      if (r.key === 'times_categorias') result.timesCategorias = cfg;
      else if (r.key === 'proximos_jogos') result.proximosJogos = cfg;
      else if (r.key === 'tabela_classificacao') result.tabelaClassificacao = cfg;
    }
    return result;
  }

  /** Atualiza configs (superadmin). */
  async update(config: IntegrationConfigDto): Promise<{ ok: boolean }> {
    const keyMap: Record<string, string> = {
      timesCategorias: 'times_categorias',
      proximosJogos: 'proximos_jogos',
      tabelaClassificacao: 'tabela_classificacao',
    };
    for (const [k, v] of Object.entries(config)) {
      const key = keyMap[k];
      if (!key) continue;
      const cfg = v && typeof v === 'object' ? v : {};
      await this.prisma.integrationConfig.upsert({
        where: { key },
        create: { key, config: cfg as object },
        update: { config: cfg as object },
      });
    }
    return { ok: true };
  }
}

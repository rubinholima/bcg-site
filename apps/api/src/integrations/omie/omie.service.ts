import { Injectable } from '@nestjs/common';

const OMIE_BASE = 'https://app.omie.com.br/api/v1';

export interface OmieStatusDto {
  configured: boolean;
  ok?: boolean;
  message?: string;
}

@Injectable()
export class OmieService {
  private getCredentials(): { appKey: string; appSecret: string } | null {
    const appKey = process.env.OMIE_APP_KEY?.trim();
    const appSecret = process.env.OMIE_APP_SECRET?.trim();
    if (!appKey || !appSecret) return null;
    return { appKey, appSecret };
  }

  /** Retorna se a integração está configurada e, se sim, se a conexão com a API Omie está ok. */
  async getStatus(): Promise<OmieStatusDto> {
    const cred = this.getCredentials();
    if (!cred) {
      return { configured: false, message: 'OMIE_APP_KEY e OMIE_APP_SECRET não configurados no servidor.' };
    }
    try {
      const res = await fetch(`${OMIE_BASE}/financas/contareceber/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call: 'ListarContasReceber',
          app_key: cred.appKey,
          app_secret: cred.appSecret,
          param: [{ pagina: 1, registros_por_pagina: 1 }],
        }),
      });
      const data = (await res.json()) as { faultstring?: string; total_de_registros?: number };
      if (data?.faultstring) {
        return { configured: true, ok: false, message: data.faultstring };
      }
      return { configured: true, ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar com a API Omie.';
      return { configured: true, ok: false, message };
    }
  }
}

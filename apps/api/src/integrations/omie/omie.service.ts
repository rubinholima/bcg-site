import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TenantsService } from '../../tenants/tenants.service';

const OMIE_BASE = 'https://app.omie.com.br/api/v1';

/** Retorno mínimo de ConsultarCliente reutilizado no cache e no enriquecimento da listagem. */
type CadastroClienteConsultaResumo = { nome?: string; cnpjCpf?: string };

export interface OmieStatusDto {
  configured: boolean;
  ok?: boolean;
  message?: string;
}

export type FinanceiroTituloFiltro = 'todos' | 'em_aberto' | 'pagos' | 'atrasados';

/** Filtros extras suportados por ListarContasReceber / ListarContasPagar (tags Omie). Datas em ISO YYYY-MM-DD. */
export interface FinanceiroRelatorioFiltros {
  dataEmissaoDe?: string;
  dataEmissaoAte?: string;
  dataRegistroDe?: string;
  dataRegistroAte?: string;
  /** Omie: filtrar_por_data_de / filtrar_por_data_ate (inclusão/alteração — ver documentação Omie). */
  dataMovimentoDe?: string;
  dataMovimentoAte?: string;
  /** Omie: filtrar_cliente (código do cliente/fornecedor no cadastro Omie). */
  codigoClienteFornecedor?: number;
  /** Omie: filtrar_por_cpf_cnpj */
  cpfCnpj?: string;
  /** Omie: filtrar_conta_corrente */
  contaCorrenteId?: number;
}

export interface OmieListagemDto {
  ok: boolean;
  message?: string;
  total: number;
  pagina: number;
  registrosPorPagina: number;
  items: Record<string, unknown>[];
  /** Quando há busca por texto, indica que o total/refino é local sobre o lote buscado na API. */
  buscaAplicadaLocal?: boolean;
  aviso?: string;
  /** Soma dos `valor_documento` apenas dos títulos desta página (relatório). */
  totais?: {
    quantidadeTitulosNaPagina: number;
    somaValorDocumentoPagina: number;
  };
}

export interface OmieConsultaTituloDto {
  ok: boolean;
  message?: string;
  registro?: Record<string, unknown>;
}

/** Soma de todos os títulos que correspondem ao filtro (paginação interna na API Omie). */
export interface OmieResumoTitulosDto {
  ok: boolean;
  message?: string;
  totalRegistrosOmie: number;
  somaValorTotal: number;
  titulosSomados: number;
  paginasPercorridas: number;
  aviso?: string;
}

/** Resumo de pedidos de compra (PesquisarPedCompra) para dashboards. */
export interface OmieResumoPedidosCompraDashboardDto {
  ok: boolean;
  message?: string;
  /** Valor dos pedidos no mês de referência (por data de inclusão no retorno). */
  valorMesTotal: number;
  /** Pedidos pendentes no mês de referência (filtro Omie). */
  valorMesPendentes: number;
  pedidosContagemTotal: number;
  pedidosContagemPendentes: number;
  aviso?: string;
  /** yyyy-MM → valor agregado (data inclusão dIncData, últimos N meses). */
  comprasPorMesKey: Record<string, number>;
  comprasPorMesChaves: string[];
}

/** ConsultarContaReceber / ConsultarContaPagar — Omie exige ao menos um dos dois identificadores. */
export interface ConsultarTituloOmieOpts {
  codigoLancamentoOmie?: number;
  codigoLancamentoIntegracao?: string;
}

@Injectable()
export class OmieService {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Uma única página de ListarClientes por tenant + TTL — evita "Consumo redundante" (REDUNDANT) do Omie
   * ao encadear muitas chamadas iguais (ex.: enriquecimento + React Strict Mode em dev).
   */
  private readonly clienteNomeMapCache = new Map<
    string,
    { map: Map<number, { nome: string; cnpjCpf?: string }>; expiresAt: number }
  >();
  private readonly clienteNomeMapInflight = new Map<
    string,
    Promise<Map<number, { nome: string; cnpjCpf?: string }>>
  >();
  private static readonly CLIENTE_NOME_CACHE_TTL_MS = 15 * 60 * 1000;

  /** Cache curto para ConsultarCliente por (tenant + codigo_cliente_omie) — evita repetir ao paginar. */
  private readonly consultaNomeClienteCache = new Map<
    string,
    { nome?: string; cnpjCpf?: string; expiresAt: number }
  >();
  private readonly consultaNomeClienteInflight = new Map<
    string,
    Promise<CadastroClienteConsultaResumo | undefined>
  >();
  private static readonly CONSULTA_NOME_CACHE_TTL_MS = 30 * 60 * 1000;

  /** Omie bloqueia chamadas repetidas muito próximas (fault REDUNDANT). */
  private static isOmieRedundantFault(msg: unknown): boolean {
    return /REDUNDANT|Consumo redundante/i.test(String(msg ?? ''));
  }

  /** Ex.: "Aguarde 5 segundos" → espera em ms (com folga). */
  private static parseOmieRedundantWaitMs(msg: unknown): number {
    const m = String(msg ?? '').match(/Aguarde\s+(\d+)\s*segundos?/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) return n * 1000 + 300;
    }
    return 5500;
  }

  private async sleepMs(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  private getEnvCredentials(): { appKey: string; appSecret: string } | null {
    const appKey = process.env.OMIE_APP_KEY?.trim();
    const appSecret = process.env.OMIE_APP_SECRET?.trim();
    if (!appKey || !appSecret) return null;
    return { appKey, appSecret };
  }

  /** Detalhe legível para falhas de fetch (Node/undici costuma devolver só "fetch failed"). */
  private formatFetchFailure(err: unknown): string {
    if (!(err instanceof Error)) return String(err);
    const parts: string[] = [err.message];
    const c = (err as Error & { cause?: unknown }).cause;
    if (c instanceof Error) parts.push(c.message);
    else if (c != null) parts.push(String(c));
    const code = (err as NodeJS.ErrnoException).code;
    if (code) parts.push(`errno=${code}`);
    return parts.filter(Boolean).join(' — ');
  }

  /** POST genérico na API JSON do Omie (v1). Retries leves em falha de rede. */
  private async omiePost(
    cred: { appKey: string; appSecret: string },
    path: string,
    call: string,
    param: unknown[],
  ): Promise<Record<string, unknown>> {
    const url = `${OMIE_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const payload = JSON.stringify({
      call,
      app_key: cred.appKey,
      app_secret: cred.appSecret,
      param,
    });

    let lastNetworkErr: unknown;
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });
        const text = await res.text();
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new ServiceUnavailableException(
            `Resposta inválida do Omie (${res.status}): ${text.slice(0, 240)}`,
          );
        }
        return data;
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        if (err instanceof ServiceUnavailableException) throw err;
        lastNetworkErr = err;
      }
    }

    const detail = this.formatFetchFailure(lastNetworkErr);
    throw new ServiceUnavailableException(
      `Não foi possível conectar a https://app.omie.com.br (${detail}). ` +
        `Confira internet, firewall, VPN, proxy ou certificados SSL nesta máquina/servidor. ` +
        `Se o erro for só "fetch failed", veja também o campo errno/cause acima (DNS, timeout, TLS).`,
    );
  }

  /** Testa App Key + Secret contra a API Omie (contas a receber — leitura mínima). */
  private async pingContasReceber(cred: {
    appKey: string;
    appSecret: string;
  }): Promise<Pick<OmieStatusDto, 'ok' | 'message'>> {
    try {
      const data = await this.omiePost(cred, '/financas/contareceber/', 'ListarContasReceber', [
        { pagina: 1, registros_por_pagina: 1 },
      ]);
      if (data.faultstring) {
        return { ok: false, message: String(data.faultstring) };
      }
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? String(err.message)
          : err instanceof Error
            ? err.message
            : 'Erro ao conectar com a API Omie.';
      return { ok: false, message };
    }
  }

  private parseDataBR(d: unknown): number {
    if (d == null || typeof d !== 'string') return 0;
    const parts = d.trim().split('/');
    if (parts.length !== 3) return 0;
    const [dia, mes, ano] = parts.map((x) => parseInt(x, 10));
    if (!dia || !mes || !ano) return 0;
    return new Date(ano, mes - 1, dia).getTime();
  }

  /** Texto pesquisável (nome, códigos, observação) para filtro local. */
  private rowToSearchBlob(row: Record<string, unknown>): string {
    const parts: string[] = [];
    const walk = (v: unknown, depth: number) => {
      if (depth > 4) return;
      if (v == null) return;
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        parts.push(String(v).toLowerCase());
        return;
      }
      if (Array.isArray(v)) {
        v.forEach((x) => walk(x, depth + 1));
        return;
      }
      if (typeof v === 'object') {
        Object.values(v as object).forEach((x) => walk(x, depth + 1));
      }
    };
    walk(row, 0);
    return parts.join(' ');
  }

  private sortByVencimentoDesc(items: Record<string, unknown>[]): void {
    items.sort(
      (a, b) =>
        this.parseDataBR(b.data_vencimento) - this.parseDataBR(a.data_vencimento),
    );
  }

  /** Omie às vezes devolve cadastro como objeto único ou como array de um elemento. */
  private unwrapCadastroOmie(reg: unknown): Record<string, unknown> | undefined {
    if (reg == null) return undefined;
    if (Array.isArray(reg)) {
      const first = reg[0];
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        return first as Record<string, unknown>;
      }
      return undefined;
    }
    if (typeof reg === 'object') return reg as Record<string, unknown>;
    return undefined;
  }

  /** Omie às vezes envia razão social com entidades HTML (&amp;). Normaliza para exibição. */
  private decodeOmieDisplayText(s: string): string {
    if (!s) return s;
    let out = s
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    out = out.replace(/&#(\d{1,7});/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
    out = out.replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
    return out;
  }

  /** Já existe nome legível na linha da listagem? */
  private rowJaTemNomeListagem(row: Record<string, unknown>): boolean {
    const keys = [
      'nome_cliente',
      'razao_social',
      'nome_fantasia',
      'denominacao',
      'nome_fornecedor',
    ];
    for (const k of keys) {
      const v = row[k];
      if (v != null && String(v).trim() !== '') return true;
    }
    const cli = row.cliente;
    if (cli && typeof cli === 'object' && !Array.isArray(cli)) {
      const c = cli as Record<string, unknown>;
      for (const k of ['razao_social', 'nome_fantasia', 'nome']) {
        const v = c[k];
        if (v != null && String(v).trim() !== '') return true;
      }
    }
    const forn = row.fornecedor;
    if (forn && typeof forn === 'object' && !Array.isArray(forn)) {
      const f = forn as Record<string, unknown>;
      for (const k of ['razao_social', 'nome_fantasia', 'nome']) {
        const v = f[k];
        if (v != null && String(v).trim() !== '') return true;
      }
    }
    return false;
  }

  private parsePositiveIntUnknown(v: unknown): number | undefined {
    if (v == null || v === '') return undefined;
    if (typeof v === 'number') {
      return Number.isFinite(v) && v > 0 ? Math.trunc(v) : undefined;
    }
    const s = String(v).trim();
    if (!s) return undefined;
    const id = parseInt(s.replace(/[^\d-]/g, ''), 10);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    return id;
  }

  /** Omie LCR/LCP usam `codigo_cliente_fornecedor` como vínculo ao cadastro geral (doc oficial). */
  private setNomeEnriquecido(row: Record<string, unknown>, nome: string): void {
    row._nomeCadastroOmie = nome;
    row.nomeCadastroOmie = nome;
  }

  private rowTemNomeParaExibir(row: Record<string, unknown>): boolean {
    if (this.rowJaTemNomeListagem(row)) return true;
    const a = row._nomeCadastroOmie;
    const b = row.nomeCadastroOmie;
    return (
      (typeof a === 'string' && a.trim() !== '') || (typeof b === 'string' && b.trim() !== '')
    );
  }

  /**
   * Varre chaves do JSON do Omie quando o formato diverge (ex.: alias nCod*).
   * Evita confundir com codigo_lancamento_*, codigo_categoria, etc.
   */
  private extrairCodigoHeuristicoCadastro(row: Record<string, unknown>): number | undefined {
    const skipKey =
      /lancamento|baixa|categoria|parcela|pedido|nfe|conta_corrente|projeto|vendedor|tipo_documento|integracao|status|emiss|entrada|vencimento|valor|observacao|numero_doc|chave|qrcode|barra|cmc7|boleto|pix|origem|operacao|bloqueio|rateio|distribuicao|lote|nf|os|cupom/i;
    for (const key of Object.keys(row)) {
      if (skipKey.test(key)) continue;
      if (
        !/(^codigo|^nCod).*?(cliente|fornecedor|favorec|omie)/i.test(key) &&
        !/^nCodCli$/i.test(key)
      ) {
        continue;
      }
      const id = this.parsePositiveIntUnknown(row[key]);
      if (id != null) return id;
    }
    return undefined;
  }

  /**
   * Código no cadastro geral Omie (cliente/fornecedor = mesmo `codigo_cliente_omie`).
   * **ListarContasReceber** documenta `codigo_cliente_fornecedor` como vínculo — prioridade máxima.
   */
  private extrairCodigoCadastroParaReceber(row: Record<string, unknown>): number | undefined {
    const keys = [
      'codigo_cliente_fornecedor',
      'codigo_cliente',
      'codigo_cliente_omie',
      'codigo_fornecedor',
      'codigo_fornecedor_omie',
      /** Algumas respostas JSON Omie usam prefixo nCod* no cadastro. */
      'nCodCliente',
      'nCodFor',
      'nCodCF',
    ];
    for (const k of keys) {
      const id = this.parsePositiveIntUnknown(row[k]);
      if (id != null) return id;
    }
    for (const nestKey of ['cliente', 'fornecedor', 'favorecido']) {
      const n = row[nestKey];
      if (n && typeof n === 'object' && !Array.isArray(n)) {
        const o = n as Record<string, unknown>;
        for (const k of ['codigo_cliente_omie', 'codigo_cliente', 'codigo_fornecedor', 'codigo']) {
          const id = this.parsePositiveIntUnknown(o[k]);
          if (id != null) return id;
        }
      }
    }
    return undefined;
  }

  private extrairCodigoReceberCompleto(row: Record<string, unknown>): number | undefined {
    return this.extrairCodigoCadastroParaReceber(row) ?? this.extrairCodigoHeuristicoCadastro(row);
  }

  private extrairCodigoCadastroParaPagar(row: Record<string, unknown>): number | undefined {
    const keys = [
      'codigo_cliente_fornecedor',
      'codigo_fornecedor',
      'codigo_fornecedor_omie',
      'codigo_cliente',
      'codigo_cliente_omie',
      'nCodCliente',
      'nCodFor',
      'nCodCF',
    ];
    for (const k of keys) {
      const id = this.parsePositiveIntUnknown(row[k]);
      if (id != null) return id;
    }
    for (const nestKey of ['fornecedor', 'cliente', 'favorecido']) {
      const n = row[nestKey];
      if (n && typeof n === 'object' && !Array.isArray(n)) {
        const o = n as Record<string, unknown>;
        for (const k of ['codigo_cliente_omie', 'codigo_fornecedor', 'codigo_cliente', 'codigo']) {
          const id = this.parsePositiveIntUnknown(o[k]);
          if (id != null) return id;
        }
      }
    }
    return undefined;
  }

  private extrairCodigoPagarCompleto(row: Record<string, unknown>): number | undefined {
    return this.extrairCodigoCadastroParaPagar(row) ?? this.extrairCodigoHeuristicoCadastro(row);
  }

  private nomeDiretoDoRegistroTitulo(reg: Record<string, unknown>): string | undefined {
    const top = [
      reg.nome_cliente,
      reg.razao_social,
      reg.nome_fantasia,
      reg.denominacao,
      reg.nome_fornecedor,
    ].find((x) => x != null && String(x).trim() !== '');
    if (top != null) return this.decodeOmieDisplayText(String(top).trim());
    for (const nestKey of ['cliente', 'fornecedor']) {
      const n = reg[nestKey];
      if (n && typeof n === 'object' && !Array.isArray(n)) {
        const o = n as Record<string, unknown>;
        const m = [o.razao_social, o.nome_fantasia, o.nome].find(
          (x) => x != null && String(x).trim() !== '',
        );
        if (m != null) return this.decodeOmieDisplayText(String(m).trim());
      }
    }
    return undefined;
  }

  private extrairDocumentoCadastroDoRegistroTitulo(reg: Record<string, unknown>): string | undefined {
    for (const k of ['cnpj_cpf', 'cpf_cnpj', 'cnpj', 'cpf']) {
      const v = reg[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    for (const nestKey of ['cliente', 'fornecedor']) {
      const n = reg[nestKey];
      if (n && typeof n === 'object' && !Array.isArray(n)) {
        const o = n as Record<string, unknown>;
        for (const k of ['cnpj_cpf', 'cpf_cnpj', 'cnpj', 'cpf']) {
          const v = o[k];
          if (v != null && String(v).trim() !== '') return String(v).trim();
        }
      }
    }
    return undefined;
  }

  /**
   * ConsultarCliente — **sem** `codigo_cliente_integracao: ""` (Omie trata como tag vazia e falha).
   */
  private async consultarClienteCadastroResumido(
    cred: { appKey: string; appSecret: string },
    codigoClienteOmie: number,
  ): Promise<CadastroClienteConsultaResumo | undefined> {
    const tentativas: Record<string, unknown>[] = [
      { codigo_cliente_omie: codigoClienteOmie },
      { clientes_cadastro_chave: { codigo_cliente_omie: codigoClienteOmie } },
    ];
    for (const param of tentativas) {
      for (let redTry = 0; redTry < 3; redTry++) {
        try {
          const data = await this.omiePost(cred, '/geral/clientes/', 'ConsultarCliente', [param]);
          if (data.faultstring) {
            const fs = String(data.faultstring);
            if (OmieService.isOmieRedundantFault(fs) && redTry < 2) {
              await this.sleepMs(OmieService.parseOmieRedundantWaitMs(fs));
              continue;
            }
            break;
          }
          const raw = data.clientes_cadastro;
          const rec = this.unwrapCadastroOmie(raw);
          if (!rec) break;
          const nomeRaw = [rec.razao_social, rec.nome_fantasia].find(
            (x) => x != null && String(x).trim() !== '',
          );
          const nome = nomeRaw
            ? this.decodeOmieDisplayText(String(nomeRaw).trim())
            : undefined;
          const docRaw = rec.cnpj_cpf ?? rec.cpf_cnpj ?? rec.cnpj ?? rec.cpf;
          const cnpjCpf =
            docRaw != null && String(docRaw).trim() !== ''
              ? String(docRaw).trim()
              : undefined;
          if (nome || cnpjCpf) return { nome, cnpjCpf };
          break;
        } catch {
          break;
        }
      }
    }
    return undefined;
  }

  private async obterCadastroClienteConsultaCache(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    codigoClienteOmie: number,
  ): Promise<CadastroClienteConsultaResumo | undefined> {
    const key = `${tenantId.trim()}:${codigoClienteOmie}`;
    const hit = this.consultaNomeClienteCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return { nome: hit.nome, cnpjCpf: hit.cnpjCpf };
    }

    const inflight = this.consultaNomeClienteInflight.get(key);
    if (inflight) return inflight;

    const p = (async () => {
      const r = await this.consultarClienteCadastroResumido(cred, codigoClienteOmie);
      if (r && (r.nome || r.cnpjCpf)) {
        this.consultaNomeClienteCache.set(key, {
          nome: r.nome,
          cnpjCpf: r.cnpjCpf,
          expiresAt: Date.now() + OmieService.CONSULTA_NOME_CACHE_TTL_MS,
        });
      }
      return r;
    })().finally(() => {
      this.consultaNomeClienteInflight.delete(key);
    });
    this.consultaNomeClienteInflight.set(key, p);
    return p;
  }

  private rowPrecisaDocumentoCadastro(row: Record<string, unknown>): boolean {
    const d = row._cnpjCpfCadastroOmie;
    return d == null || String(d).trim() === '';
  }

  /** Listagem costuma omitir `recebimento`/`pagamento`; se já veio objeto não vazio, não consultar o título só por isso. */
  private linhaJaTemBlocoBaixaListagem(row: Record<string, unknown>, contasReceber: boolean): boolean {
    const key = contasReceber ? 'recebimento' : 'pagamento';
    const r = row[key];
    if (r == null) return false;
    if (Array.isArray(r)) return r.length > 0;
    if (typeof r === 'object') return Object.keys(r as Record<string, unknown>).length > 0;
    return false;
  }

  /**
   * ConsultarCliente por código (dedupe na página): nome quando faltar, e CPF/CNPJ quando a listagem não trouxe.
   */
  private async enrichMissingNomesViaConsultaCliente(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    items: Record<string, unknown>[],
    extrairCodigo: (row: Record<string, unknown>) => number | undefined,
  ): Promise<void> {
    const porCodigo = new Map<number, Record<string, unknown>[]>();
    for (const row of items) {
      const id = extrairCodigo(row);
      if (id == null) continue;
      const needNome = !this.rowTemNomeParaExibir(row);
      const needDoc = this.rowPrecisaDocumentoCadastro(row);
      if (!needNome && !needDoc) continue;
      const list = porCodigo.get(id) ?? [];
      list.push(row);
      porCodigo.set(id, list);
    }
    let i = 0;
    for (const [codigo, rows] of porCodigo) {
      /** Espaçamento maior evita fault REDUNDANT ao consultar vários clientes na mesma página. */
      if (i++ > 0) await this.sleepMs(320);
      const r = await this.obterCadastroClienteConsultaCache(tenantId, cred, codigo);
      if (!r) continue;
      if (r.nome) {
        for (const row of rows) {
          if (!this.rowTemNomeParaExibir(row)) this.setNomeEnriquecido(row, r.nome);
        }
      }
      if (r.cnpjCpf) {
        for (const row of rows) {
          if (this.rowPrecisaDocumentoCadastro(row)) row._cnpjCpfCadastroOmie = r.cnpjCpf;
        }
      }
    }
  }

  private async resolverNomeDoTituloReceber(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    reg: Record<string, unknown>,
  ): Promise<string | undefined> {
    const d = this.nomeDiretoDoRegistroTitulo(reg);
    if (d) return d;
    const cod = this.extrairCodigoReceberCompleto(reg);
    if (cod == null) return undefined;
    const r = await this.obterCadastroClienteConsultaCache(tenantId, cred, cod);
    return r?.nome;
  }

  private async resolverNomeDoTituloPagar(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    reg: Record<string, unknown>,
  ): Promise<string | undefined> {
    const d = this.nomeDiretoDoRegistroTitulo(reg);
    if (d) return d;
    const cod = this.extrairCodigoPagarCompleto(reg);
    if (cod == null) return undefined;
    const r = await this.obterCadastroClienteConsultaCache(tenantId, cred, cod);
    return r?.nome;
  }

  /**
   * Listagem Omie muitas vezes traz só `codigo_lancamento_integracao` (string) sem `codigo_lancamento_omie`.
   * Varre chaves alternativas e objetos aninhados (ex.: lcrChave).
   */
  private extrairIdentificadoresLancamentoDaListagem(
    row: Record<string, unknown>,
    depth = 0,
  ): { omie?: number; integracao?: string } {
    if (depth > 3) return {};
    let omie: number | undefined;
    let integracao: string | undefined;

    const tryInteg = (v: unknown) => {
      if (v == null || v === '') return;
      const s = String(v).trim();
      if (s.length > 0) integracao = s;
    };
    const tryOmie = (v: unknown) => {
      const n = this.parsePositiveIntUnknown(v);
      if (n != null) omie = n;
    };

    tryOmie(row.codigo_lancamento_omie);
    /** Doc Omie `conta_receber_cadastro_chave`: mesmo papel de código do lançamento em algumas respostas. */
    if (omie == null) tryOmie(row.chave_lancamento);
    tryInteg(row.codigo_lancamento_integracao);

    for (const [key, val] of Object.entries(row)) {
      const kl = key.toLowerCase();
      if (
        integracao == null &&
        (kl === 'codigo_lancamento_integracao' ||
          (kl.includes('integracao') && kl.includes('lancamento') && !kl.includes('cliente')))
      ) {
        tryInteg(val);
      }
      if (omie == null && kl.includes('codigo_lancamento_omie') && !kl.includes('integracao')) {
        tryOmie(val);
      }
      if (omie == null && kl === 'chave_lancamento') {
        tryOmie(val);
      }
    }

    if ((omie == null || integracao == null) && depth < 3) {
      for (const nk of ['lcrChave', 'chave_lancamento', 'titulo', 'conta_receber_cadastro', 'conta_pagar_cadastro']) {
        const n = row[nk];
        if (n && typeof n === 'object' && !Array.isArray(n)) {
          const sub = this.extrairIdentificadoresLancamentoDaListagem(n as Record<string, unknown>, depth + 1);
          if (omie == null && sub.omie != null) omie = sub.omie;
          if (integracao == null && sub.integracao != null) integracao = sub.integracao;
        }
      }
    }
    return { omie, integracao };
  }

  /**
   * Último recurso: nome só pelo cadastro do título. **Não** usar quando já existe
   * `codigo_cliente_fornecedor` — nesse caso o nome vem de `ListarClientes` / `ConsultarCliente`.
   * Consultar o título em massa satura a cota Omie (REDUNDANT) e quebra o modal "Detalhes".
   */
  private async enrichNomesTituloConsultaReceber(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    items: Record<string, unknown>[],
  ): Promise<void> {
    let i = 0;
    for (const row of items) {
      if (this.rowTemNomeParaExibir(row) && this.linhaJaTemBlocoBaixaListagem(row, true)) continue;
      const ids = this.extrairIdentificadoresLancamentoDaListagem(row);
      const codLanc =
        ids.omie ??
        this.parsePositiveIntUnknown(row.codigo_lancamento_omie) ??
        this.parsePositiveIntUnknown(row.chave_lancamento);
      const integ = ids.integracao;
      if (codLanc == null && !integ) continue;
      if (i++ > 0) await this.sleepMs(400);
      const res = await this.consultarContaReceber(tenantId, {
        codigoLancamentoOmie: codLanc ?? undefined,
        codigoLancamentoIntegracao: integ,
      });
      if (!res.ok || !res.registro) continue;
      const nome = await this.resolverNomeDoTituloReceber(tenantId, cred, res.registro);
      if (nome) this.setNomeEnriquecido(row, nome);
      const doc = this.extrairDocumentoCadastroDoRegistroTitulo(res.registro);
      if (doc && this.rowPrecisaDocumentoCadastro(row)) row._cnpjCpfCadastroOmie = doc;
      const reg = res.registro;
      if (!row.recebimento && reg.recebimento != null) row.recebimento = reg.recebimento;
    }
  }

  private async enrichNomesTituloConsultaPagar(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    items: Record<string, unknown>[],
  ): Promise<void> {
    let i = 0;
    for (const row of items) {
      if (this.rowTemNomeParaExibir(row) && this.linhaJaTemBlocoBaixaListagem(row, false)) continue;
      const ids = this.extrairIdentificadoresLancamentoDaListagem(row);
      const codLanc =
        ids.omie ??
        this.parsePositiveIntUnknown(row.codigo_lancamento_omie) ??
        this.parsePositiveIntUnknown(row.chave_lancamento);
      const integ = ids.integracao;
      if (codLanc == null && !integ) continue;
      if (i++ > 0) await this.sleepMs(400);
      const res = await this.consultarContaPagar(tenantId, {
        codigoLancamentoOmie: codLanc ?? undefined,
        codigoLancamentoIntegracao: integ,
      });
      if (!res.ok || !res.registro) continue;
      const nome = await this.resolverNomeDoTituloPagar(tenantId, cred, res.registro);
      if (nome) this.setNomeEnriquecido(row, nome);
      const doc = this.extrairDocumentoCadastroDoRegistroTitulo(res.registro);
      if (doc && this.rowPrecisaDocumentoCadastro(row)) row._cnpjCpfCadastroOmie = doc;
      const reg = res.registro;
      if (!row.pagamento && reg.pagamento != null) row.pagamento = reg.pagamento;
    }
  }

  /**
   * Cadastro unificado (cliente + fornecedor) no Omie — várias páginas para não ficar só nos
   * primeiros 500 registros (caso típico de nome em branco na listagem de títulos).
   */
  private async fetchClienteNomeMapOnce(
    cacheKey: string,
    cred: { appKey: string; appSecret: string },
  ): Promise<Map<number, { nome: string; cnpjCpf?: string }>> {
    const map = new Map<number, { nome: string; cnpjCpf?: string }>();
    const registrosPorPagina = 500;
    /** Teto de páginas; o total real vem de total_de_registros quando existir. */
    const maxPaginasHard = 80;
    try {
      let totalOmie = 0;
      for (let pagina = 1; pagina <= maxPaginasHard; pagina++) {
        if (pagina > 1) await this.sleepMs(90);
        const data = await this.omiePost(cred, '/geral/clientes/', 'ListarClientes', [
          { pagina, registros_por_pagina: registrosPorPagina, apenas_importado_api: 'N' },
        ]);
        if (data.faultstring) {
          break;
        }
        if (pagina === 1) {
          const t = Number(data.total_de_registros);
          if (Number.isFinite(t) && t > 0) totalOmie = t;
        }
        const raw = data.clientes_cadastro;
        const list = Array.isArray(raw) ? raw : [];
        for (const cli of list) {
          const o = cli as Record<string, unknown>;
          const cod =
            o.codigo_cliente_omie ?? o.codigo ?? o.codigo_cliente ?? o.nCodCliente ?? o.nCodFor;
          const id = typeof cod === 'number' ? cod : parseInt(String(cod ?? ''), 10);
          if (!Number.isFinite(id) || id <= 0) continue;
          const nome = [o.razao_social, o.nome_fantasia].find(
            (x) => x != null && String(x).trim() !== '',
          );
          if (nome) {
            const docRaw = o.cnpj_cpf ?? o.cpf_cnpj ?? o.cnpj ?? o.cpf;
            const cnpjCpf =
              docRaw != null && String(docRaw).trim() !== ''
                ? String(docRaw).trim()
                : undefined;
            map.set(id, {
              nome: this.decodeOmieDisplayText(String(nome).trim()),
              cnpjCpf,
            });
          }
        }
        if (list.length < registrosPorPagina) {
          break;
        }
        const paginasNecessarias =
          totalOmie > 0 ? Math.ceil(totalOmie / registrosPorPagina) : maxPaginasHard;
        const limite = Math.min(maxPaginasHard, paginasNecessarias);
        if (pagina >= limite) {
          break;
        }
      }
    } catch {
      return map;
    }
    this.clienteNomeMapCache.set(cacheKey, {
      map,
      expiresAt: Date.now() + OmieService.CLIENTE_NOME_CACHE_TTL_MS,
    });
    return map;
  }

  private async getClienteNomeMapOmie(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
  ): Promise<Map<number, { nome: string; cnpjCpf?: string }>> {
    const key = tenantId.trim();
    if (!key) return new Map();

    const hit = this.clienteNomeMapCache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.map;
    }

    const inflight = this.clienteNomeMapInflight.get(key);
    if (inflight) {
      return inflight;
    }

    const p = this.fetchClienteNomeMapOnce(key, cred).finally(() => {
      this.clienteNomeMapInflight.delete(key);
    });
    this.clienteNomeMapInflight.set(key, p);
    return p;
  }

  /**
   * Mesmo mapa do cadastro geral Omie (fornecedor e cliente compartilham `ListarClientes`).
   */
  private getFornecedorNomeMapOmie(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
  ): Promise<Map<number, { nome: string; cnpjCpf?: string }>> {
    return this.getClienteNomeMapOmie(tenantId, cred);
  }

  /**
   * Preenche `_nomeCadastroOmie` nas linhas de **contas a receber** quando só há código,
   * usando `ListarClientes` (várias páginas no 1º preenchimento do cache) + cache por tenant.
   */
  private async enrichNomesCadastroCliente(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    items: Record<string, unknown>[],
  ): Promise<void> {
    const precisaMap = items.some((row) => {
      const id = this.extrairCodigoReceberCompleto(row);
      if (id == null) return false;
      return !this.rowJaTemNomeListagem(row) || this.rowPrecisaDocumentoCadastro(row);
    });

    if (precisaMap) {
      const map = await this.getClienteNomeMapOmie(tenantId, cred);
      for (const row of items) {
        const id = this.extrairCodigoReceberCompleto(row);
        if (id == null) continue;
        const entry = map.get(id);
        if (!this.rowJaTemNomeListagem(row) && entry?.nome) this.setNomeEnriquecido(row, entry.nome);
        if (entry?.cnpjCpf && this.rowPrecisaDocumentoCadastro(row)) {
          row._cnpjCpfCadastroOmie = entry.cnpjCpf;
        }
      }
    }

    await this.enrichMissingNomesViaConsultaCliente(tenantId, cred, items, (r) =>
      this.extrairCodigoReceberCompleto(r),
    );
    await this.enrichNomesTituloConsultaReceber(tenantId, cred, items);
  }

  /**
   * Preenche `_nomeCadastroOmie` nas linhas de **contas a pagar** pelo código do título
   * (`codigo_cliente_fornecedor` etc.) no mesmo cadastro geral do Omie (`ListarClientes`).
   */
  private async enrichNomesCadastroFornecedor(
    tenantId: string,
    cred: { appKey: string; appSecret: string },
    items: Record<string, unknown>[],
  ): Promise<void> {
    const precisaMap = items.some((row) => {
      const id = this.extrairCodigoPagarCompleto(row);
      if (id == null) return false;
      return !this.rowJaTemNomeListagem(row) || this.rowPrecisaDocumentoCadastro(row);
    });

    if (precisaMap) {
      const map = await this.getFornecedorNomeMapOmie(tenantId, cred);
      for (const row of items) {
        const id = this.extrairCodigoPagarCompleto(row);
        if (id == null) continue;
        const entry = map.get(id);
        if (!this.rowJaTemNomeListagem(row) && entry?.nome) this.setNomeEnriquecido(row, entry.nome);
        if (entry?.cnpjCpf && this.rowPrecisaDocumentoCadastro(row)) {
          row._cnpjCpfCadastroOmie = entry.cnpjCpf;
        }
      }
    }

    await this.enrichMissingNomesViaConsultaCliente(tenantId, cred, items, (r) =>
      this.extrairCodigoPagarCompleto(r),
    );
    await this.enrichNomesTituloConsultaPagar(tenantId, cred, items);
  }

  /** ISO YYYY-MM-DD → dd/mm/aaaa (Omie). */
  private isoParaOmieData10(iso: string | undefined): string | undefined {
    const s = iso?.trim();
    if (!s) return undefined;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return undefined;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  private mergeFiltrosRelatorioListagem(
    p: Record<string, unknown>,
    rel: FinanceiroRelatorioFiltros | undefined,
  ): void {
    if (!rel) return;
    const emDe = this.isoParaOmieData10(rel.dataEmissaoDe);
    const emAte = this.isoParaOmieData10(rel.dataEmissaoAte);
    if (emDe) p.filtrar_por_emissao_de = emDe;
    if (emAte) p.filtrar_por_emissao_ate = emAte;
    const regDe = this.isoParaOmieData10(rel.dataRegistroDe);
    const regAte = this.isoParaOmieData10(rel.dataRegistroAte);
    if (regDe) p.filtrar_por_registro_de = regDe;
    if (regAte) p.filtrar_por_registro_ate = regAte;
    const movDe = this.isoParaOmieData10(rel.dataMovimentoDe);
    const movAte = this.isoParaOmieData10(rel.dataMovimentoAte);
    if (movDe) p.filtrar_por_data_de = movDe;
    if (movAte) p.filtrar_por_data_ate = movAte;
    if (rel.codigoClienteFornecedor != null && rel.codigoClienteFornecedor > 0) {
      p.filtrar_cliente = rel.codigoClienteFornecedor;
    }
    const cnpj = rel.cpfCnpj?.replace(/\D/g, '') ?? '';
    if (cnpj.length >= 11) p.filtrar_por_cpf_cnpj = cnpj.slice(0, 20);
    if (rel.contaCorrenteId != null && rel.contaCorrenteId > 0) {
      p.filtrar_conta_corrente = rel.contaCorrenteId;
    }
  }

  private totaisValoresPagina(items: Record<string, unknown>[]): {
    quantidadeTitulosNaPagina: number;
    somaValorDocumentoPagina: number;
  } {
    return {
      quantidadeTitulosNaPagina: items.length,
      somaValorDocumentoPagina: this.somarValorDocumentoItems(items),
    };
  }

  private somarValorDocumentoItems(items: Record<string, unknown>[]): number {
    let soma = 0;
    for (const row of items) {
      const v = row.valor_documento;
      const n =
        typeof v === 'number'
          ? v
          : parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
      if (Number.isFinite(n)) soma += n;
    }
    return Math.round(soma * 100) / 100;
  }

  private parseDecimalOmie(v: unknown): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  /** Primeiro e último dia do mês em dd/mm/aaaa (fuso local do servidor). */
  private omieDatasMes(ref: Date = new Date()): { dataInicial: string; dataFinal: string } {
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const ultimo = new Date(y, m + 1, 0);
    const dd = (n: number) => String(n).padStart(2, '0');
    return {
      dataInicial: `01/${dd(m + 1)}/${y}`,
      dataFinal: `${dd(ultimo.getDate())}/${dd(m + 1)}/${y}`,
    };
  }

  /** Chaves `yyyy-MM` dos últimos `meses` meses a partir de `ref` (ordem cronológica). */
  static chavesUltimosMesesIso(meses: number, ref: Date = new Date()): string[] {
    const n = Math.min(24, Math.max(1, meses));
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return keys;
  }

  /** Data Omie dd/mm/aaaa → partes (agrupamento por mês). */
  private parseOmieDataDdmmaaaa(dataStr: unknown): { y: number; m: number; d: number } | null {
    const s = String(dataStr ?? '').trim();
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (!match) return null;
    const d = parseInt(match[1], 10);
    const mo = parseInt(match[2], 10);
    const y = parseInt(match[3], 10);
    if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y)) return null;
    if (mo < 1 || mo > 12) return null;
    return { y, m: mo, d };
  }

  private mesIsoKeyDeRef(ref: Date): string {
    return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  }

  /** Intervalo Omie (dd/mm/aaaa) cobrindo os últimos `meses` meses + chaves yyyy-MM. */
  private omieIntervaloUltimosMeses(ref: Date, meses: number): {
    dataInicial: string;
    dataFinal: string;
    chavesOrdenadas: string[];
    chavesSet: Set<string>;
  } {
    const chavesOrdenadas = OmieService.chavesUltimosMesesIso(meses, ref);
    const dd = (n: number) => String(n).padStart(2, '0');
    const first = chavesOrdenadas[0]?.split('-') ?? [];
    const last = chavesOrdenadas[chavesOrdenadas.length - 1]?.split('-') ?? [];
    const y0 = parseInt(first[0] ?? '0', 10);
    const m0 = parseInt(first[1] ?? '1', 10);
    const y1 = parseInt(last[0] ?? '0', 10);
    const m1 = parseInt(last[1] ?? '1', 10);
    const dataInicial = `01/${dd(m0)}/${y0}`;
    const ultDia = new Date(y1, m1, 0).getDate();
    const dataFinal = `${dd(ultDia)}/${dd(m1)}/${y1}`;
    return {
      dataInicial,
      dataFinal,
      chavesOrdenadas,
      chavesSet: new Set(chavesOrdenadas),
    };
  }

  /**
   * Pagina pedidos no intervalo e acumula valor por mês (dIncData do cabeçalho; fallback dDtPrevisao).
   */
  private async paginarPedidosCompraAcumulaPorMes(
    cred: { appKey: string; appSecret: string },
    intervalo: { dataInicial: string; dataFinal: string; chavesSet: Set<string>; chavesOrdenadas: string[] },
    flags: {
      pendentes: boolean;
      faturados: boolean;
      recebidos: boolean;
      encerrados: boolean;
      recParciais: boolean;
      fatParciais: boolean;
    },
    opts: { maxPaginas: number; pauseEntrePaginasMs: number; registrosPorPagina: number },
  ): Promise<{
    ok: boolean;
    message?: string;
    porMes: Record<string, number>;
    pedidosUnicos: number;
    linhasSomadas: number;
    aviso?: string;
  }> {
    const porMes: Record<string, number> = Object.fromEntries(
      intervalo.chavesOrdenadas.map((k) => [k, 0]),
    );
    const { maxPaginas, pauseEntrePaginasMs, registrosPorPagina } = opts;
    const seen = new Set<string>();
    let linhasSomadas = 0;
    let totalOmie = 0;
    let pagina = 1;

    while (pagina <= maxPaginas) {
      let data: Record<string, unknown> | undefined;
      let ultimoErro: string | undefined;
      for (let redRetry = 0; redRetry < 2; redRetry++) {
        data = await this.omiePost(cred, '/produtos/pedidocompra/', 'PesquisarPedCompra', [
          this.buildPesquisarPedCompraParam(
            pagina,
            registrosPorPagina,
            intervalo.dataInicial,
            intervalo.dataFinal,
            flags,
          ),
        ]);
        if (!data.faultstring) break;
        ultimoErro = String(data.faultstring);
        if (OmieService.isOmieRedundantFault(ultimoErro) && redRetry === 0) {
          await this.sleepMs(OmieService.parseOmieRedundantWaitMs(ultimoErro));
          continue;
        }
        return {
          ok: false,
          message: ultimoErro,
          porMes,
          pedidosUnicos: seen.size,
          linhasSomadas,
        };
      }
      if (!data || data.faultstring) {
        return {
          ok: false,
          message: ultimoErro ?? 'Resposta inválida do Omie.',
          porMes,
          pedidosUnicos: seen.size,
          linhasSomadas,
        };
      }

      if (pagina === 1) {
        const t = Number(data.nTotalRegistros ?? data.n_total_registros);
        totalOmie = Number.isFinite(t) ? t : 0;
      }

      const items = this.extrairPedidosPesquisaArray(data);
      for (const p of items) {
        const id = this.pedidoCompraNCodPed(p);
        if (id) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        const cab = p.cabecalho_consulta ?? p.cabecalhoConsulta ?? p.cabecalho;
        const c = (cab && typeof cab === 'object' ? cab : null) as Record<string, unknown> | null;
        const raw = c?.dIncData ?? c?.dDtPrevisao;
        const partesData = this.parseOmieDataDdmmaaaa(raw);
        if (!partesData) continue;
        const k = `${partesData.y}-${String(partesData.m).padStart(2, '0')}`;
        if (!intervalo.chavesSet.has(k)) continue;
        const val = this.valorTotalUmPedidoCompra(p);
        porMes[k] = Math.round(((porMes[k] ?? 0) + val) * 100) / 100;
        linhasSomadas += 1;
      }

      if (items.length < registrosPorPagina) break;
      pagina += 1;
      if (pagina <= maxPaginas) await this.sleepMs(pauseEntrePaginasMs);
    }

    let aviso: string | undefined;
    if (totalOmie > 0 && pagina > maxPaginas) {
      aviso = `Limite de ${maxPaginas} páginas na busca; valores por mês podem estar incompletos.`;
    }

    return {
      ok: true,
      porMes,
      pedidosUnicos: seen.size > 0 ? seen.size : linhasSomadas,
      linhasSomadas,
      aviso,
    };
  }

  private buildPesquisarPedCompraParam(
    pagina: number,
    regsPorPagina: number,
    dataInicial: string,
    dataFinal: string,
    flags: {
      pendentes: boolean;
      faturados: boolean;
      recebidos: boolean;
      encerrados: boolean;
      recParciais: boolean;
      fatParciais: boolean;
    },
  ): Record<string, unknown> {
    const tf = (b: boolean) => (b ? 'T' : 'F');
    return {
      nPagina: pagina,
      nRegsPorPagina: regsPorPagina,
      lApenasImportadoApi: 'F',
      lExibirPedidosPendentes: tf(flags.pendentes),
      lExibirPedidosFaturados: tf(flags.faturados),
      lExibirPedidosRecebidos: tf(flags.recebidos),
      lExibirPedidosCancelados: 'F',
      lExibirPedidosEncerrados: tf(flags.encerrados),
      lExibirPedidosRecParciais: tf(flags.recParciais),
      lExibirPedidosFatParciais: tf(flags.fatParciais),
      dDataInicial: dataInicial,
      dDataFinal: dataFinal,
      lApenasAlterados: 'F',
    };
  }

  private extrairPedidosPesquisaArray(data: Record<string, unknown>): Record<string, unknown>[] {
    const raw = data.pedidos_pesquisa ?? data.pedidosPesquisa;
    if (!raw) return [];
    return Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  }

  private pedidoCompraNCodPed(pedido: Record<string, unknown>): string {
    const cab = pedido.cabecalho_consulta ?? pedido.cabecalhoConsulta ?? pedido.cabecalho;
    if (!cab || typeof cab !== 'object') return '';
    const c = cab as Record<string, unknown>;
    const id = c.nCodPed ?? c.codigo_pedido;
    if (id == null) return '';
    return String(id);
  }

  /** Valor aproximado do pedido: soma de nValTot dos itens + frete/seguro/outras do frete_consulta. */
  private valorTotalUmPedidoCompra(pedido: Record<string, unknown>): number {
    const prods =
      pedido.produtos_consulta ?? pedido.produtosConsulta ?? pedido.produtos;
    const arr = Array.isArray(prods)
      ? prods
      : prods && typeof prods === 'object'
        ? [prods]
        : [];
    let sum = 0;
    for (const it of arr) {
      if (!it || typeof it !== 'object') continue;
      const row = it as Record<string, unknown>;
      sum += this.parseDecimalOmie(row.nValTot ?? row.n_val_tot);
    }
    const frete = (pedido.frete_consulta ?? pedido.freteConsulta ?? pedido.frete) as
      | Record<string, unknown>
      | undefined;
    if (frete && typeof frete === 'object') {
      sum += this.parseDecimalOmie(frete.nValFrete);
      sum += this.parseDecimalOmie(frete.nValSeguro);
      sum += this.parseDecimalOmie(frete.nValOutras);
    }
    return Math.round(sum * 100) / 100;
  }

  /**
   * Pagina PesquisarPedCompra e soma valores únicos por nCodPed (quando o código existir).
   */
  private async paginarSomaPedidosCompra(
    cred: { appKey: string; appSecret: string },
    buildParam: (pagina: number) => Record<string, unknown>,
    opts: { maxPaginas: number; pauseEntrePaginasMs: number; registrosPorPagina: number },
  ): Promise<{
    ok: boolean;
    message?: string;
    somaValor: number;
    pedidosUnicos: number;
    linhasSomadas: number;
    totalRegistrosOmie: number;
    paginasPercorridas: number;
    aviso?: string;
  }> {
    const { maxPaginas, pauseEntrePaginasMs, registrosPorPagina } = opts;
    const seen = new Set<string>();
    let soma = 0;
    let linhasSomadas = 0;
    let totalOmie = 0;
    let pagina = 1;

    while (pagina <= maxPaginas) {
      let data: Record<string, unknown> | undefined;
      let ultimoErro: string | undefined;
      for (let redRetry = 0; redRetry < 2; redRetry++) {
        data = await this.omiePost(cred, '/produtos/pedidocompra/', 'PesquisarPedCompra', [
          buildParam(pagina),
        ]);
        if (!data.faultstring) break;
        ultimoErro = String(data.faultstring);
        if (OmieService.isOmieRedundantFault(ultimoErro) && redRetry === 0) {
          await this.sleepMs(OmieService.parseOmieRedundantWaitMs(ultimoErro));
          continue;
        }
        return {
          ok: false,
          message: ultimoErro,
          somaValor: Math.round(soma * 100) / 100,
          pedidosUnicos: seen.size,
          linhasSomadas,
          totalRegistrosOmie: totalOmie,
          paginasPercorridas: Math.max(0, pagina - 1),
        };
      }
      if (!data || data.faultstring) {
        return {
          ok: false,
          message: ultimoErro ?? 'Resposta inválida do Omie.',
          somaValor: Math.round(soma * 100) / 100,
          pedidosUnicos: seen.size,
          linhasSomadas,
          totalRegistrosOmie: totalOmie,
          paginasPercorridas: Math.max(0, pagina - 1),
        };
      }

      if (pagina === 1) {
        const t = Number(data.nTotalRegistros ?? data.n_total_registros);
        totalOmie = Number.isFinite(t) ? t : 0;
      }

      const items = this.extrairPedidosPesquisaArray(data);
      for (const p of items) {
        const id = this.pedidoCompraNCodPed(p);
        if (id) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        soma += this.valorTotalUmPedidoCompra(p);
        linhasSomadas += 1;
      }

      if (items.length < registrosPorPagina) break;
      if (totalOmie > 0 && linhasSomadas >= totalOmie) break;
      pagina += 1;
      if (pagina <= maxPaginas) await this.sleepMs(pauseEntrePaginasMs);
    }

    let aviso: string | undefined;
    if (totalOmie > 0 && linhasSomadas < totalOmie && pagina > maxPaginas) {
      aviso = `Limite de ${maxPaginas} páginas: soma parcial (${linhasSomadas} de ${totalOmie} registros).`;
    }

    return {
      ok: true,
      somaValor: Math.round(soma * 100) / 100,
      pedidosUnicos: seen.size > 0 ? seen.size : linhasSomadas,
      linhasSomadas,
      totalRegistrosOmie: totalOmie > 0 ? totalOmie : linhasSomadas,
      paginasPercorridas: pagina,
      aviso,
    };
  }

  /**
   * Pedidos de compra: últimos meses agregados por data de inclusão + pendentes no mês de referência.
   */
  async resumoPedidosCompraDashboard(
    tenantId: string,
    opts?: {
      maxPaginasPorConsulta?: number;
      pauseEntrePaginasMs?: number;
      pauseEntreConsultasMs?: number;
      registrosPorPagina?: number;
      dataRef?: Date;
      /** Janela em meses para comprasPorMesKey (padrão 6). */
      mesesHistorico?: number;
    },
  ): Promise<OmieResumoPedidosCompraDashboardDto> {
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const ref = opts?.dataRef ?? new Date();
    const mesesHist = Math.min(12, Math.max(3, opts?.mesesHistorico ?? 6));
    const intervalo = this.omieIntervaloUltimosMeses(ref, mesesHist);
    const emptyPorMes: Record<string, number> = Object.fromEntries(
      intervalo.chavesOrdenadas.map((k) => [k, 0]),
    );
    const maxPag = Math.min(40, Math.max(1, opts?.maxPaginasPorConsulta ?? 18));
    const pausePg = Math.max(0, opts?.pauseEntrePaginasMs ?? 140);
    const pauseBetween = Math.max(0, opts?.pauseEntreConsultasMs ?? 220);
    const regs = Math.min(100, Math.max(10, opts?.registrosPorPagina ?? 50));

    const flagsTodasEtapas = {
      pendentes: true,
      faturados: true,
      recebidos: true,
      encerrados: true,
      recParciais: true,
      fatParciais: true,
    };
    const flagsSoPendentes = {
      pendentes: true,
      faturados: false,
      recebidos: false,
      encerrados: false,
      recParciais: false,
      fatParciais: false,
    };

    const hist = await this.paginarPedidosCompraAcumulaPorMes(cred, intervalo, flagsTodasEtapas, {
      maxPaginas: maxPag,
      pauseEntrePaginasMs: pausePg,
      registrosPorPagina: regs,
    });
    if (!hist.ok) {
      return {
        ok: false,
        message: hist.message ?? 'Falha ao pesquisar pedidos de compra.',
        valorMesTotal: 0,
        valorMesPendentes: 0,
        pedidosContagemTotal: 0,
        pedidosContagemPendentes: 0,
        comprasPorMesKey: emptyPorMes,
        comprasPorMesChaves: intervalo.chavesOrdenadas,
      };
    }

    const mesCorrenteKey = this.mesIsoKeyDeRef(ref);
    const valorMesTotal = Math.round((hist.porMes[mesCorrenteKey] ?? 0) * 100) / 100;

    await this.sleepMs(pauseBetween);

    const { dataInicial, dataFinal } = this.omieDatasMes(ref);
    const r2 = await this.paginarSomaPedidosCompra(
      cred,
      (pg) => this.buildPesquisarPedCompraParam(pg, regs, dataInicial, dataFinal, flagsSoPendentes),
      { maxPaginas: Math.min(maxPag, 15), pauseEntrePaginasMs: pausePg, registrosPorPagina: regs },
    );
    if (!r2.ok) {
      const extra = r2.message ? ` Pendentes: ${r2.message}` : '';
      const aviso = [hist.aviso, extra.trim()].filter(Boolean).join(' ') || undefined;
      return {
        ok: true,
        valorMesTotal,
        valorMesPendentes: 0,
        pedidosContagemTotal: hist.pedidosUnicos,
        pedidosContagemPendentes: 0,
        aviso,
        comprasPorMesKey: hist.porMes,
        comprasPorMesChaves: intervalo.chavesOrdenadas,
      };
    }

    const avisos = [hist.aviso, r2.aviso].filter(Boolean).join(' ');
    return {
      ok: true,
      valorMesTotal,
      valorMesPendentes: r2.somaValor,
      pedidosContagemTotal: hist.pedidosUnicos,
      pedidosContagemPendentes: r2.pedidosUnicos,
      aviso: avisos || undefined,
      comprasPorMesKey: hist.porMes,
      comprasPorMesChaves: intervalo.chavesOrdenadas,
    };
  }

  /**
   * Percorre todas as páginas Omie (até 250 × 100 títulos) e soma `valor_documento`.
   * Não usar com `busca` textual (lote local).
   */
  async resumoContasReceber(
    tenantId: string,
    opts?: {
      filtro?: FinanceiroTituloFiltro;
      filtrosRelatorio?: FinanceiroRelatorioFiltros;
      busca?: string;
      /** Padrão 250. Use valor menor em agregações (ex.: dashboard) para limitar tempo. */
      maxPaginas?: number;
      pauseEntrePaginasMs?: number;
    },
  ): Promise<OmieResumoTitulosDto> {
    const busca = opts?.busca?.trim();
    if (busca) {
      return {
        ok: false,
        message:
          'Soma total indisponível com busca textual (filtro local em lote). Limpe a busca e tente de novo.',
        totalRegistrosOmie: 0,
        somaValorTotal: 0,
        titulosSomados: 0,
        paginasPercorridas: 0,
      };
    }
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const filtro: FinanceiroTituloFiltro = opts?.filtro ?? 'todos';
    const rel = opts?.filtrosRelatorio;
    const registrosPorPagina = 100;
    const maxPaginas = Math.min(250, Math.max(1, opts?.maxPaginas ?? 250));
    const pauseMs = opts?.pauseEntrePaginasMs ?? 160;
    let pagina = 1;
    let somaTotal = 0;
    let titulosSomados = 0;
    let totalOmie = 0;

    while (pagina <= maxPaginas) {
      const data = await this.omiePost(cred, '/financas/contareceber/', 'ListarContasReceber', [
        this.buildLcrListParam(pagina, registrosPorPagina, filtro, rel),
      ]);
      if (data.faultstring) {
        return {
          ok: false,
          message: String(data.faultstring),
          totalRegistrosOmie: totalOmie,
          somaValorTotal: Math.round(somaTotal * 100) / 100,
          titulosSomados,
          paginasPercorridas: Math.max(0, pagina - 1),
        };
      }
      if (pagina === 1) {
        const t = Number(data.total_de_registros);
        totalOmie = Number.isFinite(t) ? t : 0;
      }
      const raw = data.conta_receber_cadastro;
      const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      somaTotal += this.somarValorDocumentoItems(items);
      titulosSomados += items.length;
      if (items.length < registrosPorPagina) break;
      if (totalOmie > 0 && titulosSomados >= totalOmie) break;
      pagina += 1;
      if (pagina <= maxPaginas) await this.sleepMs(pauseMs);
    }

    let aviso: string | undefined;
    if (totalOmie > 0 && titulosSomados < totalOmie && pagina > maxPaginas) {
      aviso = `Limite de ${maxPaginas} páginas Omie: soma parcial (${titulosSomados} de ${totalOmie} títulos).`;
    }

    return {
      ok: true,
      totalRegistrosOmie: totalOmie > 0 ? totalOmie : titulosSomados,
      somaValorTotal: Math.round(somaTotal * 100) / 100,
      titulosSomados,
      paginasPercorridas: pagina,
      aviso,
    };
  }

  async resumoContasPagar(
    tenantId: string,
    opts?: {
      filtro?: FinanceiroTituloFiltro;
      filtrosRelatorio?: FinanceiroRelatorioFiltros;
      busca?: string;
      maxPaginas?: number;
      pauseEntrePaginasMs?: number;
    },
  ): Promise<OmieResumoTitulosDto> {
    const busca = opts?.busca?.trim();
    if (busca) {
      return {
        ok: false,
        message:
          'Soma total indisponível com busca textual (filtro local em lote). Limpe a busca e tente de novo.',
        totalRegistrosOmie: 0,
        somaValorTotal: 0,
        titulosSomados: 0,
        paginasPercorridas: 0,
      };
    }
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const filtro: FinanceiroTituloFiltro = opts?.filtro ?? 'todos';
    const rel = opts?.filtrosRelatorio;
    const registrosPorPagina = 100;
    const maxPaginas = Math.min(250, Math.max(1, opts?.maxPaginas ?? 250));
    const pauseMs = opts?.pauseEntrePaginasMs ?? 160;
    let pagina = 1;
    let somaTotal = 0;
    let titulosSomados = 0;
    let totalOmie = 0;

    while (pagina <= maxPaginas) {
      const data = await this.omiePost(cred, '/financas/contapagar/', 'ListarContasPagar', [
        this.buildLcpListParam(pagina, registrosPorPagina, filtro, rel),
      ]);
      if (data.faultstring) {
        return {
          ok: false,
          message: String(data.faultstring),
          totalRegistrosOmie: totalOmie,
          somaValorTotal: Math.round(somaTotal * 100) / 100,
          titulosSomados,
          paginasPercorridas: Math.max(0, pagina - 1),
        };
      }
      if (pagina === 1) {
        const t = Number(data.total_de_registros);
        totalOmie = Number.isFinite(t) ? t : 0;
      }
      const raw = data.conta_pagar_cadastro;
      const items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
      somaTotal += this.somarValorDocumentoItems(items);
      titulosSomados += items.length;
      if (items.length < registrosPorPagina) break;
      if (totalOmie > 0 && titulosSomados >= totalOmie) break;
      pagina += 1;
      if (pagina <= maxPaginas) await this.sleepMs(pauseMs);
    }

    let aviso: string | undefined;
    if (totalOmie > 0 && titulosSomados < totalOmie && pagina > maxPaginas) {
      aviso = `Limite de ${maxPaginas} páginas Omie: soma parcial (${titulosSomados} de ${totalOmie} títulos).`;
    }

    return {
      ok: true,
      totalRegistrosOmie: totalOmie > 0 ? totalOmie : titulosSomados,
      somaValorTotal: Math.round(somaTotal * 100) / 100,
      titulosSomados,
      paginasPercorridas: pagina,
      aviso,
    };
  }

  private buildLcrListParam(
    pagina: number,
    registrosPorPagina: number,
    filtro: FinanceiroTituloFiltro,
    rel?: FinanceiroRelatorioFiltros,
  ): Record<string, unknown> {
    const p: Record<string, unknown> = {
      pagina,
      registros_por_pagina: registrosPorPagina,
      apenas_importado_api: 'N',
      ordenar_por: 'DATA_VENCIMENTO',
      ordem_descrescente: 'S',
      exibir_obs: 'S',
    };
    switch (filtro) {
      case 'em_aberto':
        p.filtrar_apenas_titulos_em_aberto = 'S';
        break;
      case 'pagos':
        p.filtrar_por_status = 'LIQUIDADO';
        break;
      case 'atrasados':
        p.filtrar_por_status = 'ATRASADO';
        break;
      default:
        break;
    }
    this.mergeFiltrosRelatorioListagem(p, rel);
    return p;
  }

  private buildLcpListParam(
    pagina: number,
    registrosPorPagina: number,
    filtro: FinanceiroTituloFiltro,
    rel?: FinanceiroRelatorioFiltros,
  ): Record<string, unknown> {
    const p: Record<string, unknown> = {
      pagina,
      registros_por_pagina: registrosPorPagina,
      apenas_importado_api: 'N',
      ordenar_por: 'DATA_VENCIMENTO',
      ordem_descrescente: 'S',
      exibir_obs: 'S',
    };
    switch (filtro) {
      case 'em_aberto':
        p.filtrar_apenas_titulos_em_aberto = 'S';
        break;
      case 'pagos':
        p.filtrar_por_status = 'PAGO';
        break;
      case 'atrasados':
        p.filtrar_por_status = 'ATRASADO';
        break;
      default:
        break;
    }
    this.mergeFiltrosRelatorioListagem(p, rel);
    return p;
  }

  private async getCredentialsForTenantOrThrow(tenantId: string): Promise<{ appKey: string; appSecret: string }> {
    const id = tenantId?.trim() ?? '';
    if (!id) {
      throw new BadRequestException('Informe tenantId (empresa).');
    }
    const cred = await this.tenantsService.getDecryptedOmieCredentials(id);
    if (!cred) {
      throw new BadRequestException(
        'Credenciais Omie não configuradas para esta empresa. Cadastre App Key e Secret em Empresas → editar.',
      );
    }
    return cred;
  }

  /**
   * Listagem de contas a receber (Omie: ListarContasReceber).
   * Com `busca`, busca até 100 títulos na API e filtra localmente (nome/códigos/observações), devolvendo no máx. 20 linhas.
   */
  async listContasReceber(
    tenantId: string,
    opts?: {
      pagina?: number;
      registrosPorPagina?: number;
      filtro?: FinanceiroTituloFiltro;
      busca?: string;
      filtrosRelatorio?: FinanceiroRelatorioFiltros;
    },
  ): Promise<OmieListagemDto> {
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const filtro: FinanceiroTituloFiltro = opts?.filtro ?? 'todos';
    const buscaRaw = opts?.busca?.trim().toLowerCase() ?? '';
    const comBusca = Boolean(buscaRaw);
    const paginaReq = Math.max(1, opts?.pagina ?? 1);
    const registrosPorPagina = Math.min(100, Math.max(1, opts?.registrosPorPagina ?? 20));

    const paginaFetch = comBusca ? 1 : paginaReq;
    const registrosFetch = comBusca ? 100 : registrosPorPagina;

    const rel = opts?.filtrosRelatorio;
    const data = await this.omiePost(cred, '/financas/contareceber/', 'ListarContasReceber', [
      this.buildLcrListParam(paginaFetch, registrosFetch, filtro, comBusca ? undefined : rel),
    ]);
    if (data.faultstring) {
      return {
        ok: false,
        message: String(data.faultstring),
        total: 0,
        pagina: paginaReq,
        registrosPorPagina,
        items: [],
      };
    }
    const raw = data.conta_receber_cadastro;
    let items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    this.sortByVencimentoDesc(items);
    if (comBusca) {
      items = items.filter((row) => this.rowToSearchBlob(row).includes(buscaRaw));
      items = items.slice(0, 20);
      await this.enrichNomesCadastroCliente(tenantId, cred, items);
      return {
        ok: true,
        total: items.length,
        pagina: 1,
        registrosPorPagina: 20,
        items,
        totais: this.totaisValoresPagina(items),
        buscaAplicadaLocal: true,
        aviso:
          'Busca nos 100 títulos mais recentes (por vencimento) retornados pelo Omie. Limpe a busca para paginar na API.',
      };
    }

    await this.enrichNomesCadastroCliente(tenantId, cred, items);

    const total = Number(data.total_de_registros ?? items.length);
    return {
      ok: true,
      total,
      pagina: paginaReq,
      registrosPorPagina,
      items,
      totais: this.totaisValoresPagina(items),
    };
  }

  /**
   * Listagem de contas a pagar (Omie: ListarContasPagar).
   * Ordenação por vencimento aplicada após a resposta (API de listagem tem opções limitadas de ordenação).
   */
  async listContasPagar(
    tenantId: string,
    opts?: {
      pagina?: number;
      registrosPorPagina?: number;
      filtro?: FinanceiroTituloFiltro;
      busca?: string;
      filtrosRelatorio?: FinanceiroRelatorioFiltros;
    },
  ): Promise<OmieListagemDto> {
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const filtro: FinanceiroTituloFiltro = opts?.filtro ?? 'todos';
    const buscaRaw = opts?.busca?.trim().toLowerCase() ?? '';
    const comBusca = Boolean(buscaRaw);
    const paginaReq = Math.max(1, opts?.pagina ?? 1);
    const registrosPorPagina = Math.min(100, Math.max(1, opts?.registrosPorPagina ?? 20));

    const paginaFetch = comBusca ? 1 : paginaReq;
    const registrosFetch = comBusca ? 100 : registrosPorPagina;

    const rel = opts?.filtrosRelatorio;
    const data = await this.omiePost(cred, '/financas/contapagar/', 'ListarContasPagar', [
      this.buildLcpListParam(paginaFetch, registrosFetch, filtro, comBusca ? undefined : rel),
    ]);
    if (data.faultstring) {
      return {
        ok: false,
        message: String(data.faultstring),
        total: 0,
        pagina: paginaReq,
        registrosPorPagina,
        items: [],
      };
    }
    const raw = data.conta_pagar_cadastro;
    let items = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    this.sortByVencimentoDesc(items);

    if (comBusca) {
      items = items.filter((row) => this.rowToSearchBlob(row).includes(buscaRaw));
      items = items.slice(0, 20);
      await this.enrichNomesCadastroFornecedor(tenantId, cred, items);
      return {
        ok: true,
        total: items.length,
        pagina: 1,
        registrosPorPagina: 20,
        items,
        totais: this.totaisValoresPagina(items),
        buscaAplicadaLocal: true,
        aviso:
          'Busca nos 100 títulos mais recentes (por vencimento) retornados pelo Omie. Limpe a busca para paginar na API.',
      };
    }

    await this.enrichNomesCadastroFornecedor(tenantId, cred, items);

    const total = Number(data.total_de_registros ?? items.length);
    return {
      ok: true,
      total,
      pagina: paginaReq,
      registrosPorPagina,
      items,
      totais: this.totaisValoresPagina(items),
    };
  }

  /** Consulta um título (detalhe) — base para tela de visualização / orientação de edição no Omie. */
  async consultarContaReceber(
    tenantId: string,
    opts: ConsultarTituloOmieOpts,
  ): Promise<OmieConsultaTituloDto> {
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const omie = opts.codigoLancamentoOmie;
    const integ = (opts.codigoLancamentoIntegracao ?? '').trim();
    const hasOmie = omie != null && Number.isFinite(omie) && omie > 0;
    const hasInteg = integ.length > 0;
    if (!hasOmie && !hasInteg) {
      throw new BadRequestException(
        'Informe codigo_lancamento_omie ou codigo_lancamento_integracao.',
      );
    }

    /**
     * Doc Omie: objeto plano em `param[0]`. **Não** enviar `codigo_lancamento_integracao: ""` — o Omie
     * trata como tag vazia e acusa obrigatoriedade de codigo_lancamento_omie ou integracao.
     */
    const tentativas: unknown[] = [];
    const seen = new Set<string>();
    const push = (p: unknown) => {
      const s = JSON.stringify(p);
      if (seen.has(s)) return;
      seen.add(s);
      tentativas.push(p);
    };

    if (hasOmie && hasInteg) {
      const both = { codigo_lancamento_omie: omie!, codigo_lancamento_integracao: integ };
      push([both]);
      push([{ lcrChave: both }]);
    } else if (hasOmie) {
      const sóOmie = { codigo_lancamento_omie: omie! };
      push([sóOmie]);
      push([{ lcrChave: sóOmie }]);
    }
    if (hasInteg && !hasOmie) {
      push([{ codigo_lancamento_integracao: integ }]);
      push([{ codigo_lancamento_omie: 0, codigo_lancamento_integracao: integ }]);
      push([{ lcrChave: { codigo_lancamento_integracao: integ } }]);
      push([{ lcrChave: { codigo_lancamento_omie: 0, codigo_lancamento_integracao: integ } }]);
    }

    let ultimoErro: string | undefined;
    for (const param of tentativas) {
      let data: Record<string, unknown> | undefined;
      for (let redRetry = 0; redRetry < 2; redRetry++) {
        data = await this.omiePost(
          cred,
          '/financas/contareceber/',
          'ConsultarContaReceber',
          param as unknown[],
        );
        if (!data.faultstring) break;
        ultimoErro = String(data.faultstring);
        if (OmieService.isOmieRedundantFault(ultimoErro) && redRetry === 0) {
          await this.sleepMs(OmieService.parseOmieRedundantWaitMs(ultimoErro));
          continue;
        }
        data = undefined;
        break;
      }
      if (!data || data.faultstring) continue;
      const registro = this.unwrapCadastroOmie(data.conta_receber_cadastro);
      if (registro && Object.keys(registro).length > 0) {
        return { ok: true, registro };
      }
    }
    return {
      ok: false,
      message:
        ultimoErro ?? 'Nenhum dado retornado pela consulta no Omie.',
    };
  }

  async consultarContaPagar(
    tenantId: string,
    opts: ConsultarTituloOmieOpts,
  ): Promise<OmieConsultaTituloDto> {
    const cred = await this.getCredentialsForTenantOrThrow(tenantId);
    const omie = opts.codigoLancamentoOmie;
    const integ = (opts.codigoLancamentoIntegracao ?? '').trim();
    const hasOmie = omie != null && Number.isFinite(omie) && omie > 0;
    const hasInteg = integ.length > 0;
    if (!hasOmie && !hasInteg) {
      throw new BadRequestException(
        'Informe codigo_lancamento_omie ou codigo_lancamento_integracao.',
      );
    }

    /** Mesmo critério: sem `codigo_lancamento_integracao` vazio no JSON. */
    const tentativas: unknown[] = [];
    const seen = new Set<string>();
    const push = (p: unknown) => {
      const s = JSON.stringify(p);
      if (seen.has(s)) return;
      seen.add(s);
      tentativas.push(p);
    };

    if (hasOmie && hasInteg) {
      const both = { codigo_lancamento_omie: omie!, codigo_lancamento_integracao: integ };
      push([both]);
      push([{ conta_pagar_cadastro_chave: both }]);
    } else if (hasOmie) {
      const sóOmie = { codigo_lancamento_omie: omie! };
      push([sóOmie]);
      push([{ conta_pagar_cadastro_chave: sóOmie }]);
    }
    if (hasInteg && !hasOmie) {
      push([{ codigo_lancamento_integracao: integ }]);
      push([{ codigo_lancamento_omie: 0, codigo_lancamento_integracao: integ }]);
      push([{ conta_pagar_cadastro_chave: { codigo_lancamento_integracao: integ } }]);
      push([
        { conta_pagar_cadastro_chave: { codigo_lancamento_omie: 0, codigo_lancamento_integracao: integ } },
      ]);
    }

    let ultimoErro: string | undefined;
    for (const param of tentativas) {
      let data: Record<string, unknown> | undefined;
      for (let redRetry = 0; redRetry < 2; redRetry++) {
        data = await this.omiePost(
          cred,
          '/financas/contapagar/',
          'ConsultarContaPagar',
          param as unknown[],
        );
        if (!data.faultstring) break;
        ultimoErro = String(data.faultstring);
        if (OmieService.isOmieRedundantFault(ultimoErro) && redRetry === 0) {
          await this.sleepMs(OmieService.parseOmieRedundantWaitMs(ultimoErro));
          continue;
        }
        data = undefined;
        break;
      }
      if (!data || data.faultstring) continue;
      const registro = this.unwrapCadastroOmie(data.conta_pagar_cadastro);
      if (registro && Object.keys(registro).length > 0) {
        return { ok: true, registro };
      }
    }
    return {
      ok: false,
      message:
        ultimoErro ?? 'Nenhum dado retornado pela consulta no Omie.',
    };
  }

  /**
   * Status usando variáveis globais no servidor (legado / fallback).
   * Preferir credenciais por empresa via {@link getStatusForTenant}.
   */
  async getStatus(): Promise<OmieStatusDto> {
    const cred = this.getEnvCredentials();
    if (!cred) {
      return {
        configured: false,
        message: 'OMIE_APP_KEY e OMIE_APP_SECRET não configurados no servidor.',
      };
    }
    const ping = await this.pingContasReceber(cred);
    return ping.ok
      ? { configured: true, ok: true }
      : { configured: true, ok: false, message: ping.message };
  }

  /**
   * Status da integração Omie para uma empresa (credenciais cifradas no Tenant).
   */
  async getStatusForTenant(tenantId: string): Promise<OmieStatusDto> {
    const id = tenantId?.trim();
    if (!id) {
      return { configured: false, message: 'Informe a empresa (tenant).' };
    }
    const cred = await this.tenantsService.getDecryptedOmieCredentials(id);
    if (!cred) {
      return {
        configured: false,
        message:
          'Nenhuma credencial Omie para esta empresa. Cadastre App Key e Secret em Empresas → editar empresa.',
      };
    }
    const ping = await this.pingContasReceber(cred);
    return ping.ok
      ? { configured: true, ok: true }
      : { configured: true, ok: false, message: ping.message };
  }
}

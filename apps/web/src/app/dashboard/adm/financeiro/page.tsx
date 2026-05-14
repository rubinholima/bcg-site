"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  Printer,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { FinanceiroLancamentosPanel } from "./financeiro-lancamentos-panel";

const STORAGE_TENANT_KEY = "adm_financeiro_tenant_id";

type ModoTitulo = "receber" | "pagar";
type FiltroTitulo = "todos" | "em_aberto" | "pagos" | "atrasados";
type TipoPeriodo = "nenhum" | "emissao" | "registro" | "movimento";

interface OmieListagem {
  ok: boolean;
  message?: string;
  total: number;
  pagina: number;
  registrosPorPagina: number;
  items: Record<string, unknown>[];
  buscaAplicadaLocal?: boolean;
  aviso?: string;
  totais?: {
    quantidadeTitulosNaPagina: number;
    somaValorDocumentoPagina: number;
  };
}

interface OmieResumoTitulos {
  ok: boolean;
  message?: string;
  totalRegistrosOmie: number;
  somaValorTotal: number;
  titulosSomados: number;
  paginasPercorridas: number;
  aviso?: string;
}

function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  let out = s;
  for (let i = 0; i < 3; i++) {
    const next = out
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    if (next === out) break;
    out = next;
  }
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

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && v !== "") return String(v);
  }
  return "—";
}

function formatMoney(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getNomeClienteOuFornecedor(row: Record<string, unknown>): string {
  const nomeApi = row.nomeCadastroOmie ?? row._nomeCadastroOmie;
  if (typeof nomeApi === "string" && nomeApi.trim() !== "") {
    return decodeHtmlEntities(nomeApi.trim());
  }
  const n = pickStr(row, [
    "nome_cliente",
    "razao_social",
    "nome_fantasia",
    "denominacao",
    "nome_fornecedor",
  ]);
  if (n !== "—") return decodeHtmlEntities(n);
  const cli = row.cliente;
  if (cli && typeof cli === "object" && !Array.isArray(cli)) {
    const c = cli as Record<string, unknown>;
    const m = pickStr(c, ["razao_social", "nome_fantasia", "nome"]);
    if (m !== "—") return decodeHtmlEntities(m);
  }
  const forn = row.fornecedor;
  if (forn && typeof forn === "object" && !Array.isArray(forn)) {
    const f = forn as Record<string, unknown>;
    const m = pickStr(f, ["razao_social", "nome_fantasia", "nome"]);
    if (m !== "—") return decodeHtmlEntities(m);
  }
  return "—";
}

function isOmieRedundant(msg: string): boolean {
  return /REDUNDANT|Consumo redundante/i.test(msg);
}

function omieErrorHint(msg: string): ReactNode {
  if (!isOmieRedundant(msg)) return msg;
  return (
    <span className="block space-y-2">
      <span className="block">{msg}</span>
      <span className="block text-xs text-muted-foreground font-normal">
        O Omie bloqueia muitas chamadas iguais em sequência. Aguarde os segundos indicados ou recarregue após
        1 minuto.
      </span>
    </span>
  );
}

function labelFiltro(f: FiltroTitulo): string {
  switch (f) {
    case "em_aberto":
      return "Em aberto";
    case "pagos":
      return "Pagos / liquidados";
    case "atrasados":
      return "Atrasados";
    default:
      return "Todos";
  }
}

function labelTipoPeriodo(t: TipoPeriodo): string {
  switch (t) {
    case "emissao":
      return "Emissão";
    case "registro":
      return "Registro";
    case "movimento":
      return "Movimento";
    default:
      return "";
  }
}

function parseMoneyNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function getCodigoCadastroRow(row: Record<string, unknown>): string {
  for (const k of ["codigo_cliente_fornecedor", "codigo_cliente", "codigo_cliente_omie"]) {
    const v = row[k];
    if (v != null && v !== "") return String(v);
  }
  for (const nest of [row.cliente, row.fornecedor]) {
    if (nest && typeof nest === "object" && !Array.isArray(nest)) {
      const o = nest as Record<string, unknown>;
      for (const k of ["codigo_cliente_omie", "codigo_cliente", "codigo"]) {
        const v = o[k];
        if (v != null && v !== "") return String(v);
      }
    }
  }
  return "—";
}

function getCpfCnpjRow(row: Record<string, unknown>): string {
  const enr = row._cnpjCpfCadastroOmie;
  if (typeof enr === "string" && enr.trim() !== "") return enr.trim();
  const top = pickStr(row, ["cnpj_cpf", "cpf_cnpj", "CNPJ_CPF"]);
  if (top !== "—") return top;
  for (const nest of [row.cliente, row.fornecedor]) {
    if (nest && typeof nest === "object" && !Array.isArray(nest)) {
      const o = nest as Record<string, unknown>;
      const m = pickStr(o, ["cnpj_cpf", "cpf_cnpj", "cnpj", "cpf"]);
      if (m !== "—") return m;
    }
  }
  return "—";
}

interface BaixaResumo {
  data: string;
  valorBaixa: unknown;
  juros: number;
  multa: number;
  desconto: number;
}

function getBaixaResumo(row: Record<string, unknown>, modo: ModoTitulo): BaixaResumo | null {
  const key = modo === "receber" ? "recebimento" : "pagamento";
  let raw: unknown = row[key];
  if (Array.isArray(raw) && raw.length > 0) raw = raw[0];
  let data = "—";
  let valorBaixa: unknown;
  let juros = 0;
  let multa = 0;
  let desconto = 0;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const b = raw as Record<string, unknown>;
    data = pickStr(b, ["data"]);
    valorBaixa = b.valor;
    juros = parseMoneyNumber(b.juros) ?? 0;
    multa = parseMoneyNumber(b.multa) ?? 0;
    desconto = parseMoneyNumber(b.desconto) ?? 0;
  }
  if (data === "—") {
    data = pickStr(row, [
      modo === "receber" ? "data_credito" : "data_pagamento",
      "data_liquidacao",
      "data_baixa",
      "data_ultimo_pagamento",
    ]);
  }
  if (valorBaixa == null || valorBaixa === "") {
    const vr = row.valor_baixado ?? row.valor_recebido ?? row.valor_pago ?? row.valor_liquidado;
    if (vr != null && vr !== "") valorBaixa = vr;
  }
  if (juros === 0 && multa === 0 && desconto === 0) {
    juros = parseMoneyNumber(row.valor_juros ?? row.juros) ?? 0;
    multa = parseMoneyNumber(row.valor_multa ?? row.multa) ?? 0;
    desconto = parseMoneyNumber(row.valor_desconto ?? row.desconto) ?? 0;
  }
  if (
    data === "—" &&
    (valorBaixa == null || valorBaixa === "") &&
    juros === 0 &&
    multa === 0 &&
    desconto === 0
  ) {
    return null;
  }
  return {
    data: data === "—" ? "—" : data,
    valorBaixa,
    juros,
    multa,
    desconto,
  };
}

/** Valor líquido de acréscimos (juros + multa − desconto) na baixa. */
function formatExtrasBaixa(b: BaixaResumo): string {
  const net = b.juros + b.multa - b.desconto;
  if (net === 0 && b.juros === 0 && b.multa === 0 && b.desconto === 0) return "—";
  if (Math.abs(net) < 0.005) return "—";
  const sign = net > 0 ? "+" : "";
  return `${sign}${net.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}

type AreaTab = "operacao" | "omie";

export default function AdmFinanceiroPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [areaTab, setAreaTab] = useState<AreaTab>("operacao");

  const [modo, setModo] = useState<ModoTitulo>("receber");
  const [filtro, setFiltro] = useState<FiltroTitulo>("todos");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("nenhum");
  const [periodoDe, setPeriodoDe] = useState("");
  const [periodoAte, setPeriodoAte] = useState("");
  const [codigoClienteFornecedor, setCodigoClienteFornecedor] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [contaCorrenteId, setContaCorrenteId] = useState("");

  const [list, setList] = useState<OmieListagem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [resumo, setResumo] = useState<OmieResumoTitulos | null>(null);
  const [resumoLoading, setResumoLoading] = useState(false);
  const [resumoErr, setResumoErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(buscaInput.trim()), 400);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      const listTen = Array.isArray(data) ? data : [];
      setTenants(listTen);
      if (listTen.length === 0) {
        setTenantId("");
        return;
      }
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_TENANT_KEY) : null;
      const fallback = stored && listTen.some((t) => t.id === stored) ? stored : listTen[0].id;
      setTenantId((prev) => (prev && listTen.some((t) => t.id === prev) ? prev : fallback));
    } catch {
      setTenants([]);
      setTenantId("");
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccessModule("adm_financeiro") && !authLoading) return;
    void loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (tenantId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_TENANT_KEY, tenantId);
    }
  }, [tenantId]);

  useEffect(() => {
    setPagina(1);
  }, [
    modo,
    filtro,
    buscaDebounced,
    pageSize,
    tipoPeriodo,
    periodoDe,
    periodoAte,
    codigoClienteFornecedor,
    cpfCnpj,
    contaCorrenteId,
  ]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const hasCred = Boolean(selectedTenant?.omieIntegrationConfigured);

  const appendRelatorioParams = (p: URLSearchParams) => {
    if (tipoPeriodo === "emissao") {
      if (periodoDe) p.set("dataEmissaoDe", periodoDe);
      if (periodoAte) p.set("dataEmissaoAte", periodoAte);
    } else if (tipoPeriodo === "registro") {
      if (periodoDe) p.set("dataRegistroDe", periodoDe);
      if (periodoAte) p.set("dataRegistroAte", periodoAte);
    } else if (tipoPeriodo === "movimento") {
      if (periodoDe) p.set("dataMovimentoDe", periodoDe);
      if (periodoAte) p.set("dataMovimentoAte", periodoAte);
    }
    if (codigoClienteFornecedor.trim()) p.set("codigoClienteFornecedor", codigoClienteFornecedor.trim());
    if (cpfCnpj.trim()) p.set("cpfCnpj", cpfCnpj.trim());
    if (contaCorrenteId.trim()) p.set("contaCorrenteId", contaCorrenteId.trim());
  };

  const qs = useMemo(() => {
    if (!tenantId) return "";
    const p = new URLSearchParams({
      tenantId,
      pagina: String(pagina),
      registros: String(pageSize),
      filtro,
    });
    if (buscaDebounced) p.set("busca", buscaDebounced);
    appendRelatorioParams(p);
    return p.toString();
  }, [
    tenantId,
    pagina,
    filtro,
    buscaDebounced,
    pageSize,
    tipoPeriodo,
    periodoDe,
    periodoAte,
    codigoClienteFornecedor,
    cpfCnpj,
    contaCorrenteId,
  ]);

  const qsResumo = useMemo(() => {
    if (!tenantId) return "";
    const p = new URLSearchParams({ tenantId, filtro });
    if (buscaDebounced) p.set("busca", buscaDebounced);
    appendRelatorioParams(p);
    return p.toString();
  }, [
    tenantId,
    filtro,
    buscaDebounced,
    tipoPeriodo,
    periodoDe,
    periodoAte,
    codigoClienteFornecedor,
    cpfCnpj,
    contaCorrenteId,
  ]);

  useEffect(() => {
    if (!tenantId || !hasCred || !qsResumo) {
      setResumo(null);
      setResumoErr(null);
      setResumoLoading(false);
      return;
    }
    if (buscaDebounced) {
      setResumo(null);
      setResumoErr(null);
      setResumoLoading(false);
      return;
    }
    let cancelled = false;
    setResumoLoading(true);
    setResumoErr(null);
    setResumo(null);
    const t = window.setTimeout(() => {
      const path =
        modo === "receber"
          ? `/financeiro/omie/contas-receber/resumo?${qsResumo}`
          : `/financeiro/omie/contas-pagar/resumo?${qsResumo}`;
      void api
        .get<OmieResumoTitulos>(path)
        .then(({ data }) => {
          if (cancelled) return;
          setResumo(data);
          if (!data.ok && data.message) setResumoErr(data.message);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setResumoErr(e instanceof Error ? e.message : "Erro ao calcular o total.");
        })
        .finally(() => {
          if (!cancelled) setResumoLoading(false);
        });
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [tenantId, hasCred, qsResumo, modo, buscaDebounced]);

  useEffect(() => {
    if (!tenantId || !hasCred || !qs) {
      setList(null);
      setErr(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setList(null);
    const path =
      modo === "receber"
        ? `/financeiro/omie/contas-receber?${qs}`
        : `/financeiro/omie/contas-pagar?${qs}`;
    void api
      .get<OmieListagem>(path)
      .then(({ data }) => {
        if (!cancelled) setList(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Erro ao carregar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, hasCred, modo, qs]);

  const totalPages = list
    ? Math.max(1, Math.ceil(list.total / (list.registrosPorPagina || pageSize)))
    : 1;
  const hidePagination = Boolean(list?.buscaAplicadaLocal);

  const linhasResumoImpressao = useMemo(() => {
    const lines: string[] = [];
    lines.push(`${modo === "receber" ? "Contas a receber" : "Contas a pagar"} · ${labelFiltro(filtro)}`);
    if (tipoPeriodo !== "nenhum" && (periodoDe || periodoAte)) {
      const lab = labelTipoPeriodo(tipoPeriodo);
      lines.push(`${lab}: ${periodoDe || "…"} → ${periodoAte || "…"}`);
    }
    if (codigoClienteFornecedor.trim()) {
      lines.push(
        `${modo === "receber" ? "Cliente" : "Fornecedor"} (código): ${codigoClienteFornecedor.trim()}`,
      );
    }
    if (cpfCnpj.trim()) lines.push(`CPF/CNPJ: ${cpfCnpj.trim()}`);
    if (contaCorrenteId.trim()) lines.push(`Conta corrente: ${contaCorrenteId.trim()}`);
    return lines;
  }, [
    modo,
    filtro,
    tipoPeriodo,
    periodoDe,
    periodoAte,
    codigoClienteFornecedor,
    cpfCnpj,
    contaCorrenteId,
  ]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("adm_financeiro")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6 print:max-w-none">
      <div
        className={
          areaTab === "omie"
            ? "hidden print:block text-center border-b border-zinc-800 pb-3 mb-4 text-zinc-900 bg-white"
            : "hidden"
        }
      >
        <h1 className="text-xl font-bold">Relatório financeiro (Omie)</h1>
        {selectedTenant && <p className="text-sm mt-1">{selectedTenant.name}</p>}
        <p className="text-xs mt-2 space-y-0.5">
          {linhasResumoImpressao.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </p>
        <p className="text-xs mt-2">
          Página {list?.pagina ?? pagina} · {list?.total ?? "—"} título(s) no filtro
        </p>
        {list?.totais && (
          <p className="text-xs mt-1">
            Soma desta página: {formatMoney(list.totais.somaValorDocumentoPagina)} (
            {list.totais.quantidadeTitulosNaPagina} título(s))
          </p>
        )}
        {resumo?.ok && (
          <p className="text-sm font-semibold mt-2">
            Total geral (filtros atuais): {formatMoney(resumo.somaValorTotal)} · {resumo.titulosSomados}{" "}
            título(s)
            {resumo.aviso ? ` — ${resumo.aviso}` : ""}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 print:hidden">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Contas a pagar e a receber do grupo (cadastro interno). A aba Omie oferece relatórios gerenciais quando a
            integração estiver configurada.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" variant={areaTab === "operacao" ? "default" : "outline"} size="sm" onClick={() => setAreaTab("operacao")}>
          Lançamentos
        </Button>
        <Button type="button" variant={areaTab === "omie" ? "default" : "outline"} size="sm" onClick={() => setAreaTab("omie")}>
          Omie (gerencial)
        </Button>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <div className="flex items-start gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            <div>
              <CardTitle className="text-lg">Empresa</CardTitle>
              <CardDescription>
                {areaTab === "operacao"
                  ? "Selecione a empresa para lançamentos e filtros."
                  : "Selecione a empresa para carregar os títulos no Omie."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tenantsLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando empresas...
            </p>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa.{" "}
              <Link href="/dashboard/empresas" className="text-primary underline underline-offset-2">
                Cadastre uma empresa
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:max-w-md">
              <label htmlFor="financeiro-tenant" className="text-sm font-medium text-foreground">
                Empresa ativa
              </label>
              <Select
                value={tenantId}
                onValueChange={(v) => {
                  setTenantId(v);
                  setPagina(1);
                }}
              >
                <SelectTrigger id="financeiro-tenant" className="w-full text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTenant && !hasCred && areaTab === "omie" && (
                <p className="text-sm text-amber-600 dark:text-amber-400/90">
                  Integração Omie não configurada para esta empresa — necessária só para a visão gerencial abaixo.{" "}
                  <Link
                    href={`/dashboard/empresas/${tenantId}/edit#integracao-omie`}
                    className="underline font-medium"
                  >
                    Configurar integração
                  </Link>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {tenantId && areaTab === "operacao" && <FinanceiroLancamentosPanel tenantId={tenantId} />}

      {tenantId && areaTab === "omie" && hasCred && (
        <Card className="print:shadow-none print:border print:border-zinc-300 print:bg-white print:text-zinc-900">
          <CardHeader className="print:hidden">
            <div className="flex flex-col gap-2">
              <CardTitle>Títulos (Omie)</CardTitle>
              <CardDescription>
                Leitura dos títulos no ERP para conferência e impressão. Lançamentos do dia a dia ficam na aba Lançamentos.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="sticky top-0 z-10 -mx-6 px-6 py-3 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 print:hidden">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>
              {resumoLoading && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  Calculando total geral…
                </span>
              )}
              {buscaDebounced && (
                <span className="text-xs text-muted-foreground">
                  Com a busca aberta, o total geral não é calculado (só a página).
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Button
                type="button"
                variant={modo === "receber" ? "default" : "outline"}
                size="sm"
                onClick={() => setModo("receber")}
              >
                Contas a receber
              </Button>
              <Button
                type="button"
                variant={modo === "pagar" ? "default" : "outline"}
                size="sm"
                onClick={() => setModo("pagar")}
              >
                Contas a pagar
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 print:hidden">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Situação</label>
                <Select value={filtro} onValueChange={(v) => setFiltro(v as FiltroTitulo)}>
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="em_aberto">Em aberto (não quitados)</SelectItem>
                    <SelectItem value="pagos">Pagos / liquidados</SelectItem>
                    <SelectItem value="atrasados">Atrasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Linhas por página</label>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(parseInt(v, 10) || 20)}
                >
                  <SelectTrigger className="text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:hidden">
              <div className="space-y-2 sm:col-span-2 xl:col-span-3">
                <label htmlFor="financeiro-tipo-periodo" className="text-sm font-medium text-foreground">
                  Tipo de filtro de período
                </label>
                <Select
                  value={tipoPeriodo}
                  onValueChange={(v) => setTipoPeriodo(v as TipoPeriodo)}
                >
                  <SelectTrigger id="financeiro-tipo-periodo" className="w-full max-w-md text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Sem período (só situação e demais filtros)</SelectItem>
                    <SelectItem value="emissao">Data de emissão</SelectItem>
                    <SelectItem value="registro">Data de registro</SelectItem>
                    <SelectItem value="movimento">Data de movimento</SelectItem>
                  </SelectContent>
                </Select>
                {tipoPeriodo !== "nenhum" && (
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center pt-1">
                    <Input
                      type="date"
                      className="text-foreground w-full sm:max-w-[200px] [&::-webkit-datetime-edit]:text-foreground"
                      value={periodoDe}
                      onChange={(e) => setPeriodoDe(e.target.value)}
                      aria-label={`${labelTipoPeriodo(tipoPeriodo)} de`}
                    />
                    <span className="text-muted-foreground text-sm hidden sm:inline">até</span>
                    <Input
                      type="date"
                      className="text-foreground w-full sm:max-w-[200px] [&::-webkit-datetime-edit]:text-foreground"
                      value={periodoAte}
                      onChange={(e) => setPeriodoAte(e.target.value)}
                      aria-label={`${labelTipoPeriodo(tipoPeriodo)} até`}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {modo === "receber" ? "Filtrar por código do cliente" : "Filtrar por código do fornecedor"}
                </label>
                <Input
                  inputMode="numeric"
                  className="text-foreground"
                  placeholder="Opcional"
                  value={codigoClienteFornecedor}
                  onChange={(e) => setCodigoClienteFornecedor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CPF / CNPJ</label>
                <Input
                  className="text-foreground"
                  placeholder="Somente números ou com máscara"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Conta corrente</label>
                <Input
                  inputMode="numeric"
                  className="text-foreground"
                  placeholder="Opcional"
                  value={contaCorrenteId}
                  onChange={(e) => setContaCorrenteId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 print:hidden">
              <label className="text-sm font-medium text-foreground">Buscar na lista</label>
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                  placeholder="Nome, documento, observação…"
                  className="pl-9 text-foreground"
                />
              </div>
            </div>

            {list?.aviso && (
              <p className="text-xs text-amber-600 dark:text-amber-400/90 print:hidden">{list.aviso}</p>
            )}

            {resumoErr && (
              <p className="text-sm text-destructive print:hidden">{omieErrorHint(resumoErr)}</p>
            )}
            {resumo && !resumo.ok && resumo.message && !resumoErr && (
              <p className="text-sm text-amber-600 dark:text-amber-400/90 print:hidden">
                {omieErrorHint(resumo.message)}
              </p>
            )}

            {list?.totais && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm print:border-zinc-300 print:bg-zinc-50 print:text-zinc-900">
                <p className="font-medium text-foreground print:text-zinc-900">
                  Soma desta página:{" "}
                  <span className="tabular-nums">{formatMoney(list.totais.somaValorDocumentoPagina)}</span>
                  <span className="text-muted-foreground font-normal print:text-zinc-600">
                    {" "}
                    · {list.totais.quantidadeTitulosNaPagina} título(s)
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 print:text-zinc-600">
                  Títulos no filtro: {list.total}.
                </p>
                {resumo?.ok && (
                  <p className="text-sm font-semibold text-foreground mt-2 pt-2 border-t border-border print:border-zinc-300 print:text-zinc-900">
                    Total geral:{" "}
                    <span className="tabular-nums">{formatMoney(resumo.somaValorTotal)}</span>
                    <span className="text-muted-foreground font-normal text-xs print:text-zinc-600">
                      {" "}
                      · {resumo.titulosSomados} título(s)
                    </span>
                  </p>
                )}
                {resumo?.aviso && (
                  <p className="text-xs text-amber-600 dark:text-amber-400/90 mt-1 print:text-amber-800">
                    {resumo.aviso}
                  </p>
                )}
              </div>
            )}

            {!hidePagination && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
                <p className="text-sm text-muted-foreground">
                  Página {pagina}
                  {list ? ` · ${list.total} título(s)` : ""}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pagina <= 1 || loading}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pagina >= totalPages || loading}
                    onClick={() => setPagina((p) => p + 1)}
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </p>
            ) : err ? (
              <p className="text-sm text-destructive py-4">{omieErrorHint(err)}</p>
            ) : list && !list.ok ? (
              <p className="text-sm text-amber-600 dark:text-amber-400 py-4">
                {omieErrorHint(list.message ?? "Não foi possível listar.")}
              </p>
            ) : (
              <div className="rounded-md border border-border overflow-x-auto print:border-zinc-300 print:bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="print:border-zinc-300">
                      <TableHead className="min-w-[140px] text-foreground print:text-zinc-900">
                        {modo === "receber" ? "Cliente" : "Fornecedor"}
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-foreground print:text-zinc-900">Código</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[120px] text-foreground print:text-zinc-900">
                        CPF / CNPJ
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-foreground print:text-zinc-900">
                        Vencimento
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-foreground print:text-zinc-900">
                        Valor título
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-foreground print:text-zinc-900">
                        {modo === "receber" ? "Recebido em" : "Pago em"}
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-foreground print:text-zinc-900">
                        {modo === "receber" ? "Valor recebido" : "Valor pago"}
                      </TableHead>
                      <TableHead className="whitespace-nowrap min-w-[100px] text-foreground print:text-zinc-900">
                        Juros / multa / desc.
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-foreground print:text-zinc-900">Status</TableHead>
                      <TableHead className="min-w-[100px] text-foreground print:text-zinc-900">Documento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(list?.items ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-muted-foreground text-sm py-8 print:text-zinc-600">
                          Nenhum lançamento encontrado com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      list!.items.map((row, i) => {
                        const baixa = getBaixaResumo(row, modo);
                        const extrasLabel =
                          baixa && (baixa.juros !== 0 || baixa.multa !== 0 || baixa.desconto !== 0)
                            ? `Juros: ${formatMoney(baixa.juros)} · Multa: ${formatMoney(baixa.multa)} · Desc.: ${formatMoney(baixa.desconto)}`
                            : undefined;
                        return (
                          <TableRow
                            key={`${String(row.codigo_lancamento_omie ?? row.codigo_lancamento_integracao ?? i)}`}
                            className="print:border-zinc-200"
                          >
                            <TableCell className="text-sm font-medium max-w-[200px] text-foreground print:text-zinc-900">
                              <span className="line-clamp-2">{getNomeClienteOuFornecedor(row)}</span>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground tabular-nums print:text-zinc-900">
                              {getCodigoCadastroRow(row)}
                            </TableCell>
                            <TableCell className="text-sm text-foreground tabular-nums print:text-zinc-900">
                              {getCpfCnpjRow(row)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground print:text-zinc-900">
                              {pickStr(row, ["data_vencimento", "data_previsao"])}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground tabular-nums print:text-zinc-900">
                              {formatMoney(row.valor_documento)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground print:text-zinc-900">
                              {baixa?.data && baixa.data !== "—" ? baixa.data : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-foreground tabular-nums print:text-zinc-900">
                              {baixa?.valorBaixa != null && baixa.valorBaixa !== ""
                                ? formatMoney(baixa.valorBaixa)
                                : "—"}
                            </TableCell>
                            <TableCell
                              className="whitespace-nowrap text-sm text-foreground tabular-nums print:text-zinc-900"
                              title={extrasLabel}
                            >
                              {baixa ? formatExtrasBaixa(baixa) : "—"}
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate text-foreground print:text-zinc-900">
                              {pickStr(row, ["status_titulo", "status", "descricao_status"])}
                            </TableCell>
                            <TableCell className="text-sm max-w-[120px] truncate text-foreground print:text-zinc-900">
                              {pickStr(row, [
                                "numero_documento",
                                "numero_pedido",
                                "numero_documento_fiscal",
                              ])}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                    {list?.totais && (list.items?.length ?? 0) > 0 && (
                      <TableRow className="bg-muted/50 font-medium print:bg-zinc-100">
                        <TableCell colSpan={4} className="text-foreground print:text-zinc-900">
                          Total nesta página
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground print:text-zinc-900">
                          {formatMoney(list.totais.somaValorDocumentoPagina)}
                        </TableCell>
                        <TableCell colSpan={5} className="text-muted-foreground text-sm print:text-zinc-700">
                          {list.totais.quantidadeTitulosNaPagina} título(s)
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

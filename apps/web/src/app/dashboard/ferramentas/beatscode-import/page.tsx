"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, FileUp, Loader2, Users, CalendarDays, FileText, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { authFetch } from "@/lib/authFetch";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ClubOption = { id: string; name: string; slug: string };

type BeatscodeStatus = {
  credentialsConfigured: boolean;
  apiUrl: string;
  tenantSlug: string;
  recommendedFlow?: string;
  lastImport: {
    importedAt?: string;
    source?: string;
    tenantSlug?: string;
    created?: number;
    updated?: number;
    skipped?: number;
    categoriesProcessed?: string[];
    errors?: string[];
  } | null;
};

export default function BeatscodeImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const agendaFileRef = useRef<HTMLInputElement>(null);
  const contractsFileRef = useRef<HTMLInputElement>(null);
  const { canAccessModule, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<BeatscodeStatus | null>(null);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [targetTenantSlug, setTargetTenantSlug] = useState("boston-city-fc-brasil");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<
    | "file"
    | "api"
    | "agenda-file"
    | "agenda-api"
    | "contracts-file"
    | "contracts-api"
    | "contracts-manifest-s3"
    | "documents-sync"
    | null
  >(null);
  const [agendaMessage, setAgendaMessage] = useState<string | null>(null);
  const [contractsMessage, setContractsMessage] = useState<string | null>(null);
  const [documentsMessage, setDocumentsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canView = canAccessModule("fmf_scraper");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [statusRes, clubsRes] = await Promise.all([
        authFetch("/api/beatscode-import/status"),
        api.get<ClubOption[]>("/tenants?clubsOnly=1"),
      ]);
      if (statusRes.ok) {
        const st = (await statusRes.json()) as BeatscodeStatus;
        setStatus(st);
        if (st.tenantSlug) setTargetTenantSlug(st.tenantSlug);
      }
      setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);
    } catch {
      setError("Erro ao carregar status Beatscode.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !canView) {
      router.replace("/403");
      return;
    }
    if (canView) load();
  }, [authLoading, canView, load, router]);

  const handleImportFromFile = async (file: File) => {
    setRunning("file");
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const exportData = JSON.parse(text) as unknown;
      const res = await authFetch("/api/beatscode-import/import-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export: exportData, tenantSlug: targetTenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha ao importar JSON.");
        return;
      }
      setMessage(
        `Importação do JSON: ${data.created ?? 0} criado(s), ${data.updated ?? 0} atualizado(s).` +
          (data.errors?.length ? ` ${data.errors.length} aviso(s).` : ""),
      );
      await load();
    } catch {
      setError("Arquivo JSON inválido ou erro na importação.");
    } finally {
      setRunning(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleImportApi = async () => {
    setRunning("api");
    setError(null);
    setMessage(null);
    try {
      const res = await authFetch("/api/beatscode-import/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryKeys: ["sub20", "sub17", "sub15", "sub14", "sub13"],
          downloadPhotos: true,
          tenantSlug: targetTenantSlug,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha na importação.");
        return;
      }
      setMessage(
        `Importação direta: ${data.created ?? 0} criado(s), ${data.updated ?? 0} atualizado(s).`,
      );
      await load();
    } catch {
      setError("Erro ao importar do Beatscode.");
    } finally {
      setRunning(null);
    }
  };

  const handleImportAgendaFromFile = async (file: File) => {
    setRunning("agenda-file");
    setError(null);
    setAgendaMessage(null);
    try {
      const text = await file.text();
      const exportData = JSON.parse(text) as unknown;
      const res = await authFetch("/api/beatscode-import/import-agenda-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export: exportData, tenantSlug: targetTenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha ao importar agenda.");
        return;
      }
      setAgendaMessage(
        `Agenda: ${data.entriesCreated ?? 0} criado(s), ${data.entriesUpdated ?? 0} atualizado(s), ${data.entriesSkipped ?? 0} ignorado(s). ` +
          `Viagens: ${data.travelsCreated ?? 0} criada(s), ${data.travelsSkipped ?? 0} ignorada(s).`,
      );
    } catch {
      setError("JSON de agenda inválido ou erro na importação.");
    } finally {
      setRunning(null);
      if (agendaFileRef.current) agendaFileRef.current.value = "";
    }
  };

  const handleImportAgendaApi = async () => {
    setRunning("agenda-api");
    setError(null);
    setAgendaMessage(null);
    try {
      const res = await authFetch("/api/beatscode-import/run-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: targetTenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha na importação da agenda.");
        return;
      }
      setAgendaMessage(
        `Agenda: ${data.entriesCreated ?? 0} criado(s), ${data.entriesUpdated ?? 0} atualizado(s), ${data.entriesSkipped ?? 0} ignorado(s).`,
      );
    } catch {
      setError("Erro ao importar agenda do Beatscode.");
    } finally {
      setRunning(null);
    }
  };

  const handleImportContractsFromFile = async (file: File) => {
    setRunning("contracts-file");
    setError(null);
    setContractsMessage(null);
    try {
      const text = await file.text();
      const exportData = JSON.parse(text) as unknown;
      const res = await authFetch("/api/beatscode-import/import-contracts-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ export: exportData, tenantSlug: targetTenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha ao importar contratos.");
        return;
      }
      setContractsMessage(
        `Contratos: ${data.playersUpdated ?? 0} jogador(es) atualizado(s), ${data.contractsLinked ?? 0} contrato(s) vinculado(s).` +
          (data.skippedNoPlayer ? ` ${data.skippedNoPlayer} sem jogador correspondente.` : ""),
      );
    } catch {
      setError("JSON de contratos inválido ou erro na importação.");
    } finally {
      setRunning(null);
      if (contractsFileRef.current) contractsFileRef.current.value = "";
    }
  };

  const handleImportContractsManifestS3 = async () => {
    setRunning("contracts-manifest-s3");
    setError(null);
    setContractsMessage(null);
    const BATCH = 40;
    let offset = 0;
    let totalDocs = 0;
    let totalFiles = 0;
    let totalSkipped = 0;
    let manifestTotal = 0;
    const allErrors: string[] = [];
    try {
      while (true) {
        setContractsMessage(
          `Vinculando PDFs do S3… lote ${Math.floor(offset / BATCH) + 1} (${offset} / ${offset + BATCH} entradas do manifest)`,
        );
        const res = await authFetch("/api/beatscode-import/import-contracts-manifest-s3", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantSlug: targetTenantSlug, limit: BATCH, offset }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof data.message === "string"
              ? data.message
              : Array.isArray(data.message)
                ? data.message.join("; ")
                : typeof data.error === "string"
                  ? data.error
                  : `HTTP ${res.status}`;
          setError(`Falha ao vincular PDFs (offset ${offset}): ${msg}`);
          return;
        }
        totalDocs += data.legalDocumentsCreated ?? 0;
        totalFiles += data.filesDownloaded ?? 0;
        totalSkipped += data.skippedExisting ?? 0;
        if (data.manifestEntriesTotal) manifestTotal = data.manifestEntriesTotal;
        if (Array.isArray(data.errors) && data.errors.length) {
          allErrors.push(...data.errors.slice(0, 5));
        }
        const total = manifestTotal || data.manifestEntriesTotal || offset + BATCH;
        const done = offset + (data.batchSize ?? BATCH);
        setContractsMessage(`Progresso: ${Math.min(done, total)} / ${total} entradas do manifest…`);
        if (!data.hasMore) break;
        offset += BATCH;
      }
      setContractsMessage(
        `PDFs contratos (S3): ${totalDocs} LegalDocument(s), ${totalFiles} arquivo(s) processado(s).` +
          (totalSkipped ? ` ${totalSkipped} já existiam.` : "") +
          (allErrors.length ? ` Avisos: ${allErrors.slice(0, 3).join(" | ")}` : ""),
      );
    } catch {
      setError("Erro de rede ao importar PDFs de contratos do S3 (timeout?). Tente de novo ou rode no servidor: pnpm beatscode:upload-contracts-s3");
    } finally {
      setRunning(null);
    }
  };

  const handleImportContractsApi = async () => {
    setRunning("contracts-api");
    setError(null);
    setContractsMessage(null);
    try {
      const res = await authFetch("/api/beatscode-import/run-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: targetTenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha na importação de contratos.");
        return;
      }
      setContractsMessage(
        `Contratos: ${data.playersUpdated ?? 0} jogador(es), ${data.contractsLinked ?? 0} contrato(s) vinculado(s).`,
      );
    } catch {
      setError("Erro ao importar contratos do Beatscode.");
    } finally {
      setRunning(null);
    }
  };

  const handleSyncDocuments = async () => {
    setRunning("documents-sync");
    setError(null);
    setDocumentsMessage(null);
    try {
      const res = await authFetch("/api/beatscode-import/sync-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: targetTenantSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.message === "string" ? data.message : data.error ?? "Falha ao sincronizar documentos.");
        return;
      }
      setDocumentsMessage(
        `Documentos: ${data.filesDownloaded ?? 0} arquivo(s) no S3, ${data.documentsUpdated ?? 0} atualizado(s), ` +
          `${data.legalDocumentsCreated ?? 0} contrato(s) jurídico(s).` +
          (data.skippedNoPath ? ` ${data.skippedNoPath} sem caminho (falta MySQL Beatscode).` : ""),
      );
    } catch {
      setError("Erro ao sincronizar documentos do Beatscode.");
    } finally {
      setRunning(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (!canView) return null;

  const last = status?.lastImport;

  return (
    <>
      <DashboardDeptHeader
        section="Ferramentas"
        sectionIcon={Database}
        title="Importação Beatscode — Atletas"
        description="Export local → JSON → import na produção. Credenciais Beatscode só no seu PC, não no servidor."
      />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {agendaMessage && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          {agendaMessage}
        </div>
      )}

      {contractsMessage && (
        <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
          {contractsMessage}
        </div>
      )}

      {documentsMessage && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {documentsMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clube destino</CardTitle>
          <CardDescription>
            Os atletas do Beatscode (base Sub-14…20) vão para o clube selecionado. Padrão:{" "}
            <strong>Boston City FC Brasil</strong> — não USA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label htmlFor="targetTenant">Importar para</Label>
            <Select value={targetTenantSlug} onValueChange={setTargetTenantSlug} disabled={!!running}>
              <SelectTrigger id="targetTenant" className="min-h-[44px]">
                <SelectValue placeholder="Selecione o clube" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.slug}>
                    {c.name} ({c.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produção (recomendado)</CardTitle>
          <CardDescription>
            1) No seu PC (pasta <code className="text-xs">apps/api</code>):{" "}
            <code className="text-xs">pnpm beatscode:export</code> gera{" "}
            <code className="text-xs">data/beatscode-athletes-export.json</code>
            <br />
            2) Envie o JSON ao servidor (SCP/SFTP — não commitar)
            <br />
            3) No servidor:{" "}
            <code className="text-xs">pnpm --filter api beatscode:import:file caminho/do/arquivo.json</code>
            <br />
            Ou use o botão abaixo para importar pelo dashboard (sem credenciais Beatscode no servidor).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFromFile(f);
            }}
          />
          <Button
            variant="default"
            disabled={!!running}
            onClick={() => fileRef.current?.click()}
          >
            {running === "file" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Importar JSON exportado
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Agenda / Logística (Beatscode)
          </CardTitle>
          <CardDescription>
            Treinos, compromissos e jogos da agenda Beatscode →{" "}
            <strong>Futebol → Logística → Agenda</strong>. Todas as categorias disponíveis na API
            (Sub-14…20; Sub-13 quando existir no Beatscode). Itens já importados são ignorados.
            <br />
            Local: <code className="text-xs">pnpm --filter api beatscode:export-agenda</code> →{" "}
            <code className="text-xs">data/beatscode-agenda-export.json</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            ref={agendaFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportAgendaFromFile(f);
            }}
          />
          <Button
            variant="default"
            disabled={!!running}
            onClick={() => agendaFileRef.current?.click()}
          >
            {running === "agenda-file" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Importar JSON da agenda
          </Button>
          <Button
            variant="outline"
            disabled={!!running || !status?.credentialsConfigured}
            onClick={handleImportAgendaApi}
          >
            {running === "agenda-api" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="mr-2 h-4 w-4" />
            )}
            Importar agenda direto (local)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contratos (Beatscode)
          </CardTitle>
          <CardDescription>
            Atletas, venda futura, comissão técnica e manutenção — vinculados ao jogador pelo{" "}
            <code className="text-xs">employeeId</code> do Beatscode. Situação ativa em{" "}
            <strong>Dados esportivos → Situação do contrato</strong>.
            <br />
            <strong>Metadados:</strong>{" "}
            <code className="text-xs">pnpm --filter api beatscode:export-contracts</code> → importar
            JSON abaixo.
            <br />
            <strong>PDFs (887):</strong> no PC{" "}
            <code className="text-xs">pnpm beatscode:download-contracts</code>, depois{" "}
            <code className="text-xs">aws s3 sync</code> para{" "}
            <code className="text-xs">beatscode-staging/contracts-download/</code> e botão
            &quot;Vincular PDFs do S3&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            ref={contractsFileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportContractsFromFile(f);
            }}
          />
          <Button
            variant="default"
            disabled={!!running}
            onClick={() => contractsFileRef.current?.click()}
          >
            {running === "contracts-file" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Importar JSON de contratos
          </Button>
          <Button
            variant="secondary"
            disabled={!!running}
            onClick={handleImportContractsManifestS3}
          >
            {running === "contracts-manifest-s3" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-4 w-4" />
            )}
            Vincular PDFs de contratos (S3 staging)
          </Button>
          <Button
            variant="outline"
            disabled={!!running || !status?.credentialsConfigured}
            onClick={handleImportContractsApi}
          >
            {running === "contracts-api" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Importar contratos direto (local)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            PDFs e anexos (Beatscode → S3)
          </CardTitle>
          <CardDescription>
            Baixa os arquivos reais (RG, contratos, etc.) e grava no <strong>S3</strong> — mesma
            pasta que a produção usa. Depois vincula ao jogador na aba <strong>Documentos</strong> e
            em <strong>Jurídico</strong> (contratos).
            <br />
            <strong>Sem banco MySQL da Beatscode</strong> usamos <strong>Playwright</strong> (Chrome
            automatizado): entra no painel, abre cada atleta, clica em &quot;Visualizar Anexo&quot; e
            sobe o PDF.
            <br />
            Local: <code className="text-xs">pnpm --filter api beatscode:sync-documents</code>
            {` `}
            (demora — um atleta por vez). Teste:{" "}
            <code className="text-xs">BEATSCODE_BROWSER_PLAYER_LIMIT=3</code>
            {` `}
            Ver o navegador: <code className="text-xs">BEATSCODE_HEADED=1</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={!!running || !status?.credentialsConfigured}
            onClick={handleSyncDocuments}
          >
            {running === "documents-sync" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="mr-2 h-4 w-4" />
            )}
            Sincronizar PDFs (local)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Local (opcional)</CardTitle>
          <CardDescription>
            Importação direta da API Beatscode — só funciona se{" "}
            <code className="text-xs">BEATSCODE_USERNAME/PASSWORD</code> estiver no .env local.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            disabled={!!running || !status?.credentialsConfigured}
            onClick={handleImportApi}
          >
            {running === "api" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
            Importar direto da API
          </Button>
        </CardContent>
      </Card>

      {last?.importedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Última importação</CardTitle>
            <CardDescription>
              {new Date(last.importedAt).toLocaleString("pt-BR")}
              {last.source ? ` · ${last.source}` : ""}
              {(last.tenantSlug ? ` · ${last.tenantSlug}` : "")}{" "}
              — {last.created ?? 0} criados, {last.updated ?? 0} atualizados
            </CardDescription>
          </CardHeader>
          {last.categoriesProcessed && last.categoriesProcessed.length > 0 && (
            <CardContent className="text-sm text-muted-foreground">
              Categorias: {last.categoriesProcessed.join(" · ")}
            </CardContent>
          )}
          {last.errors && last.errors.length > 0 && (
            <CardContent>
              <ul className="text-xs text-amber-400 space-y-1 max-h-40 overflow-y-auto">
                {last.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}

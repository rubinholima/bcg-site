"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Database, FileUp, Loader2, Users } from "lucide-react";
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
  const { canAccessModule, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<BeatscodeStatus | null>(null);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [targetTenantSlug, setTargetTenantSlug] = useState("boston-city-fc-brasil");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<"file" | "api" | null>(null);
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
          categoryKeys: ["sub20", "sub17", "sub15", "sub14"],
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

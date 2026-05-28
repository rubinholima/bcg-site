"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink, DollarSign, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

interface IntegrationItem {
  spreadsheetUrl?: string;
  gid?: string;
}

interface ConfigDto {
  timesCategorias?: IntegrationItem;
  proximosJogos?: IntegrationItem;
  tabelaClassificacao?: IntegrationItem;
}

interface OmieStatus {
  configured: boolean;
  ok?: boolean;
  message?: string;
}

function OmieIntegrationCard() {
  const [status, setStatus] = useState<OmieStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/settings/integrations/omie/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OmieStatus | null) => {
        if (!cancelled) setStatus(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-600" />
          <div>
            <CardTitle>Omie (Financeiro)</CardTitle>
            <CardDescription>
              Integração com o ERP Omie para contas a receber, faturamento e finanças. Configure no servidor.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verificando status...
          </p>
        ) : status?.configured ? (
          <div className="flex flex-wrap items-center gap-3">
            {status.ok ? (
              <>
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Integração configurada e conectada
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    Configurado, mas falha na conexão
                  </span>
                  {status.message && (
                    <p className="text-xs text-muted-foreground mt-1">{status.message}</p>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-medium text-foreground">Configure no servidor (variáveis de ambiente)</p>
            <p className="text-muted-foreground">
              No <code className="rounded bg-muted px-1">.env</code> da API, defina:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><code className="rounded bg-muted px-1">OMIE_APP_KEY</code> — chave do app no painel Omie</li>
              <li><code className="rounded bg-muted px-1">OMIE_APP_SECRET</code> — secret do app (Resumo do app → exibir)</li>
            </ul>
            <a
              href="https://developer.omie.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Documentação Omie
            </a>
          </div>
        )}
        <Link href="/dashboard/adm/financeiro">
          <Button variant="outline" size="sm">
            <DollarSign className="h-4 w-4 mr-2" />
            Ir para Financeiro
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function IntegracoesPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [config, setConfig] = useState<ConfigDto>({});

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace("/403");
      return;
    }
  }, [authLoading, isSuperAdmin, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    authFetch("/api/settings/integrations")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: ConfigDto) => {
        if (!cancelled) setConfig(data ?? {});
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const updateLocal = (key: keyof ConfigDto, item: IntegrationItem) => {
    setConfig((prev) => ({ ...prev, [key]: item }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await authFetch("/api/settings/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Erro"));
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
      )}

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Templates CSV</CardTitle>
          <CardDescription>
            Baixe os templates para criar suas planilhas no Google Sheets. Depois configure a URL abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-4">
            <a
              href="/templates/times-categorias-template.csv"
              download
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Times por Categorias
            </a>
            <a
              href="/api/public/templates/proximos-jogos"
              download="proximos-jogos-template.csv"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Próximos Jogos (com listas)
            </a>
            <a
              href="/templates/tabela-classificacao-template.csv"
              download
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Tabela Classificação
            </a>
            <a
              href="/api/public/cadastros/tabela-listas?format=csv"
              download="listas-tabela-dropdowns.csv"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Listas para dropdowns (tabela)
            </a>
          </div>
        </CardContent>
      </Card>

      {/* APIs externas */}
      <Card>
        <CardHeader>
          <CardTitle>APIs externas (SofaScore, Football-Data, API Futebol)</CardTitle>
          <CardDescription>
            IDs dos times são configurados no cadastro de cada empresa/clube (Editar Empresa).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/empresas">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ir para Empresas
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Base integração: Omie (Financeiro) */}
      <OmieIntegrationCard />

      {/* Planilhas únicas */}
      <Card>
        <CardHeader>
          <CardTitle>Planilhas Google Sheets</CardTitle>
          <CardDescription>
            Uma planilha por tipo. Use a coluna clube/slug para separar dados por clube. O Sync nos editores filtra por slug automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <>
              {(
                [
                  {
                    key: "timesCategorias" as const,
                    label: "Times por Categorias",
                  },
                  {
                    key: "proximosJogos" as const,
                    label: "Próximos Jogos",
                  },
                  {
                    key: "tabelaClassificacao" as const,
                    label: "Tabela Classificação",
                  },
                ] as const
              ).map(({ key, label }) => {
                const item = config[key] ?? {};
                return (
                  <div key={key} className="space-y-2 rounded-lg border p-4">
                    <Label className="font-medium">{label}</Label>
                    <Input
                      placeholder="URL ou ID da planilha"
                      value={item.spreadsheetUrl ?? ""}
                      onChange={(e) => {
                        const v = e.target.value ?? "";
                        const gidMatch = v.match(/[?&]gid=(\d+)/i) || v.match(/#gid=(\d+)/i);
                        updateLocal(key, {
                          ...item,
                          spreadsheetUrl: v || undefined,
                          gid: gidMatch?.[1] ?? item.gid ?? "0",
                        });
                      }}
                    />
                    <Input
                      placeholder="GID da aba (0)"
                      value={item.gid ?? ""}
                      onChange={(e) =>
                        updateLocal(key, {
                          ...item,
                          gid: e.target.value || "0",
                        })
                      }
                    />
                  </div>
                );
              })}
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                {success && (
                  <span className="text-sm text-green-600 dark:text-green-400">Salvo.</span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

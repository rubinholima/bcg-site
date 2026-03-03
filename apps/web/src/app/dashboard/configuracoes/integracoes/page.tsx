"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground">
            Configure as planilhas Google Sheets (uma por tipo). O sistema filtra por slug ao buscar.
          </p>
        </div>
      </div>

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

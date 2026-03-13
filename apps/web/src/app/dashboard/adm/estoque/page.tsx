"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

interface OmieStatus {
  configured: boolean;
  ok?: boolean;
  message?: string;
}

export default function AdmEstoquePage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [omieStatus, setOmieStatus] = useState<OmieStatus | null>(null);
  const [omieLoading, setOmieLoading] = useState(true);

  useEffect(() => {
    if (!canAccessModule("adm_estoque") && !authLoading) return;
    let cancelled = false;
    authFetch("/api/settings/integrations/omie/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: OmieStatus | null) => {
        if (!cancelled) setOmieStatus(data ?? null);
      })
      .catch(() => {
        if (!cancelled) setOmieStatus(null);
      })
      .finally(() => {
        if (!cancelled) setOmieLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccessModule, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("adm_estoque")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-8 w-8" />
            Estoque
          </h1>
          <p className="text-muted-foreground">
            Departamento administrativo — produtos e inventário via integração Omie
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle>Integração Omie</CardTitle>
                <CardDescription>
                  Produtos, estoque e inventário via ERP Omie. A configuração fica em Configurações → Integrações.
                </CardDescription>
              </div>
            </div>
            <Link href="/dashboard/configuracoes/integracoes">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurar integrações
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {omieLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando conexão com Omie...
            </p>
          ) : omieStatus?.configured ? (
            <div className="flex flex-wrap items-center gap-3">
              {omieStatus.ok ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Conectado ao Omie
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Erro na conexão
                    </span>
                    {omieStatus.message && (
                      <p className="text-xs text-muted-foreground mt-1">{omieStatus.message}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Configure OMIE_APP_KEY e OMIE_APP_SECRET no servidor (Configurações → Integrações).
            </p>
          )}
          <a
            href="https://developer.omie.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Documentação da API Omie
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aguardando integração</CardTitle>
          <CardDescription>
            Produtos, estoque e inventário vindos do Omie serão exibidos aqui após a integração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Configure a integração Omie para sincronizar dados de estoque. Esta tela mostrará produtos, níveis de estoque e alertas de reposição.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

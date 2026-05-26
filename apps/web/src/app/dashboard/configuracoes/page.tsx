"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Link2, Settings, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { canAccessModule, isSuperAdmin, loading } = useAuth();

  const canViewComprasSettings =
    canAccessModule("configuracoes") ||
    canAccessModule("adm_compras") ||
    canAccessModule("adm_financeiro");

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canAccessModule("configuracoes") && !canViewComprasSettings) {
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
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Ajustes gerais do dashboard
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {canViewComprasSettings && (
          <Link href="/dashboard/configuracoes/compras">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Requisições</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}

        {isSuperAdmin && (
          <>
            <Link href="/dashboard/configuracoes/modulos">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Sliders className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Módulos</CardTitle>
                    <CardDescription>
                      Definir quais perfis (Company Admin, Editor) podem acessar cada módulo do menu. Apenas super admin.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
            <Link href="/dashboard/configuracoes/integracoes">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Integrações</CardTitle>
                    <CardDescription>
                      Planilhas Google Sheets (Times por Categorias, Próximos Jogos, Tabela Classificação) e templates.
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </>
        )}

        {!isSuperAdmin && !canViewComprasSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
              <CardDescription>
                Outras opções de configuração podem ser adicionadas aqui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Apenas o super admin pode gerenciar permissões de módulos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

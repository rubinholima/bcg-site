"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Package, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { isTechnologyAssetKind } from "@/lib/infrastructure-tech-kinds";
import { AssetInfrastructureTab } from "@/components/dashboard/infraestrutura/AssetInfrastructureTab";
import type { AssetRow } from "../components/AssetFormDialog";

type TabId = "patrimonio" | "infraestrutura";

export default function PatrimonioAssetPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [loading, setLoading] = useState(true);
  const tabParam = searchParams.get("tab");
  const isTech = asset ? isTechnologyAssetKind(asset.category?.kind) : false;
  const [tab, setTab] = useState<TabId>(
    tabParam === "infraestrutura" ? "infraestrutura" : "patrimonio",
  );

  useEffect(() => {
    if (tabParam === "infraestrutura" && isTech) setTab("infraestrutura");
  }, [tabParam, isTech]);

  useEffect(() => {
    if (!canAccessModule("adm_patrimonio") && !authLoading) return;
    if (!id) return;
    setLoading(true);
    api
      .get<AssetRow>(`/patrimonio/assets/${id}`)
      .then(({ data }) => setAsset(data))
      .catch(() => setAsset(null))
      .finally(() => setLoading(false));
  }, [id, canAccessModule, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessModule("adm_patrimonio")) {
    router.replace("/403");
    return null;
  }

  if (!asset) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/adm/patrimonio">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <p className="text-muted-foreground">Patrimônio não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/dashboard/adm/patrimonio"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Patrimônio
          </Link>
          <h1 className="text-xl font-semibold truncate">{asset.description}</h1>
          <p className="text-sm text-muted-foreground">
            {asset.tenant.name} · {asset.category.name}
            {asset.tagNumber ? ` · Etiqueta ${asset.tagNumber}` : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setTab("patrimonio")}
          className={`shrink-0 px-3 py-2 text-sm font-medium rounded-t-md min-h-[40px] ${
            tab === "patrimonio" ? "bg-muted text-foreground" : "text-muted-foreground"
          }`}
        >
          <Package className="inline h-4 w-4 mr-1" />
          Patrimônio
        </button>
        {isTech ? (
          <button
            type="button"
            onClick={() => setTab("infraestrutura")}
            className={`shrink-0 px-3 py-2 text-sm font-medium rounded-t-md min-h-[40px] ${
              tab === "infraestrutura" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <Server className="inline h-4 w-4 mr-1" />
            Infraestrutura
          </button>
        ) : null}
      </div>

      {tab === "patrimonio" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados patrimoniais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Local:</span> {asset.location ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Responsável:</span>{" "}
              {asset.responsibleName ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span> {asset.status}
            </p>
            <p className="sm:col-span-2">
              <span className="text-muted-foreground">Observações:</span> {asset.notes ?? "—"}
            </p>
            <Link href="/dashboard/adm/patrimonio" className="text-primary text-sm hover:underline sm:col-span-2">
              Editar dados patrimoniais na listagem
            </Link>
          </CardContent>
        </Card>
      ) : canAccessModule("infraestrutura") ? (
        <AssetInfrastructureTab assetId={id} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Sem permissão para Infraestrutura TI. Solicite acesso ao módulo Infraestrutura.
        </p>
      )}
    </div>
  );
}

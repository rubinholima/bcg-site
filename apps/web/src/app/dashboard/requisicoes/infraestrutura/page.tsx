"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Network, Package, Server } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import {
  InfrastructureTenantFilter,
} from "@/components/dashboard/infraestrutura/InfrastructureShared";

interface DashboardStats {
  techAssets: number;
  withProfile: number;
  withoutProfile: number;
  racks: number;
  topologyLinks: number;
  backboneFibers: number;
  backups: number;
  credentials: number;
}

interface TechAsset {
  id: string;
  description: string;
  tagNumber: string | null;
  tenant: { id: string; name: string };
  category: { name: string; kind: string };
  infrastructureProfile?: {
    hostname: string | null;
    ipAddress: string | null;
    infraStatus: string | null;
  } | null;
}

export default function InfraestruturaDashboardPage() {
  const [tenantId, setTenantId] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [assets, setAssets] = useState<TechAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const [statsRes, assetsRes] = await Promise.all([
        api.get<DashboardStats>(`/infraestrutura/dashboard${qs}`),
        api.get<TechAsset[]>(`/infraestrutura/assets${qs}`),
      ]);
      setStats(statsRes.data);
      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : []);
    } catch {
      setStats(null);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = stats
    ? [
        { label: "Equipamentos TI", value: stats.techAssets, icon: Server },
        { label: "Ficha técnica", value: stats.withProfile, icon: Package },
        { label: "Pendentes", value: stats.withoutProfile, icon: Network },
        { label: "Racks", value: stats.racks, icon: Server },
        { label: "Topologia", value: stats.topologyLinks, icon: Network },
        { label: "Backbone", value: stats.backboneFibers, icon: Network },
      ]
    : [];

  return (
    <div className="space-y-6">
      <InfrastructureTenantFilter value={tenantId} onChange={setTenantId} />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Card key={c.label}>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-2">
                    <c.icon className="h-4 w-4" />
                    {c.label}
                  </CardDescription>
                  <CardTitle className="text-2xl">{c.value}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Patrimônio tecnológico</CardTitle>
              <CardDescription>
                Bens já cadastrados em Patrimônio — abra a ficha técnica sem duplicar cadastro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {assets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum equipamento com categoria tecnológica. Cadastre em ADM → Patrimônio com
                  categoria Informática, Infraestrutura, Audiovisual ou Segurança.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border">
                  {assets.slice(0, 20).map((a) => (
                    <li key={a.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.tenant.name} · {a.category.name}
                          {a.infrastructureProfile?.hostname
                            ? ` · ${a.infrastructureProfile.hostname}`
                            : ""}
                          {a.infrastructureProfile?.ipAddress
                            ? ` · ${a.infrastructureProfile.ipAddress}`
                            : ""}
                        </p>
                      </div>
                      <Link
                        href={`/dashboard/adm/patrimonio/${a.id}?tab=infraestrutura`}
                        className="text-sm text-primary hover:underline shrink-0 min-h-[40px] flex items-center"
                      >
                        Ficha técnica
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {assets.length > 20 ? (
                <p className="text-xs text-muted-foreground pt-2">
                  Mostrando 20 de {assets.length}. Use os filtros em Rede ou Patrimônio.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

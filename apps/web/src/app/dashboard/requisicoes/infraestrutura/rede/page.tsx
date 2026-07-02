"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { InfrastructureTenantFilter } from "@/components/dashboard/infraestrutura/InfrastructureShared";

export default function InfraRedePage() {
  const [tenantId, setTenantId] = useState("");
  const [assets, setAssets] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get(`/infraestrutura/assets${qs}`);
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <InfrastructureTenantFilter value={tenantId} onChange={setTenantId} />
      <Card>
        <CardHeader>
          <CardTitle>Rede — equipamentos patrimoniais</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          ) : assets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum equipamento.</p>
          ) : (
            <ul className="divide-y divide-border">
              {assets.map((a) => {
                const profile = a.infrastructureProfile as Record<string, unknown> | null | undefined;
                return (
                  <li key={String(a.id)} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div>
                      <p className="font-medium">{String(a.description)}</p>
                      <p className="text-xs text-muted-foreground">
                        IP: {String(profile?.ipAddress ?? "—")} · Host:{" "}
                        {String(profile?.hostname ?? "—")} · VLAN: {String(profile?.vlan ?? "—")}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/adm/patrimonio/${String(a.id)}?tab=infraestrutura`}
                      className="text-sm text-primary hover:underline min-h-[40px] flex items-center"
                    >
                      Editar rede
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

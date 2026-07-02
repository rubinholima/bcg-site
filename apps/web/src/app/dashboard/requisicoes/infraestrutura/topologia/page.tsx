"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { InfrastructureTenantFilter } from "@/components/dashboard/infraestrutura/InfrastructureShared";

export default function InfraTopologiaPage() {
  const [tenantId, setTenantId] = useState("");
  const [links, setLinks] = useState<Array<Record<string, unknown>>>([]);
  const [assets, setAssets] = useState<Array<{ id: string; description: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const [topoRes, assetsRes] = await Promise.all([
        api.get(`/infraestrutura/topology${qs}`),
        api.get<Array<{ id: string; description: string }>>(`/infraestrutura/assets${qs}`),
      ]);
      setLinks(Array.isArray(topoRes.data) ? topoRes.data : []);
      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : []);
    } catch {
      setLinks([]);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addLink() {
    if (!tenantId || !sourceId || !targetId) return;
    setSaving(true);
    try {
      await api.post("/infraestrutura/topology", {
        tenantId,
        sourceAssetId: sourceId,
        targetAssetId: targetId,
        connectionType: "fibra",
      });
      setSourceId("");
      setTargetId("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <InfrastructureTenantFilter value={tenantId} onChange={setTenantId} />
      <Card>
        <CardHeader>
          <CardTitle>Nova conexão</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs text-muted-foreground">Origem</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[40px]"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              <option value="">—</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Destino</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground min-h-[40px]"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              <option value="">—</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.description}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" disabled={saving || !tenantId} onClick={() => void addLink()}>
              Conectar
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Topologia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conexão cadastrada.</p>
          ) : (
            links.map((link) => {
              const src = link.sourceAsset as { description?: string } | undefined;
              const tgt = link.targetAsset as { description?: string } | undefined;
              return (
                <div
                  key={String(link.id)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm"
                >
                  <span>
                    {src?.description ?? "?"} ↓ {tgt?.description ?? "?"}{" "}
                    <span className="text-muted-foreground">({String(link.connectionType)})</span>
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      void api.delete(`/infraestrutura/topology/${String(link.id)}`).then(load)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

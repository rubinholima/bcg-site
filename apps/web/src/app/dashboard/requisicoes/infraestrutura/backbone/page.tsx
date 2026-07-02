"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { InfrastructureTenantFilter } from "@/components/dashboard/infraestrutura/InfrastructureShared";

export default function InfraBackbonePage() {
  const [tenantId, setTenantId] = useState("");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get(`/infraestrutura/backbone${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addFiber() {
    if (!tenantId || !origin.trim() || !destination.trim()) return;
    await api.post("/infraestrutura/backbone", { tenantId, origin, destination });
    setOrigin("");
    setDestination("");
    await load();
  }

  return (
    <div className="space-y-4">
      <InfrastructureTenantFilter value={tenantId} onChange={setTenantId} />
      <Card>
        <CardHeader>
          <CardTitle>Documentação de fibras</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Origem</Label>
            <Input className="mt-1 text-foreground" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Destino</Label>
            <Input
              className="mt-1 text-foreground"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={() => void addFiber()} disabled={!tenantId}>
              Adicionar fibra
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-2">
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma fibra documentada.</p>
          ) : (
            rows.map((r) => (
              <div key={String(r.id)} className="flex justify-between gap-2 border-b py-2 text-sm">
                <span>
                  {String(r.origin)} → {String(r.destination)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => void api.delete(`/infraestrutura/backbone/${String(r.id)}`).then(load)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

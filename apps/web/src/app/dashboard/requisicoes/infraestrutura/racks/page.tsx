"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { InfrastructureTenantFilter } from "@/components/dashboard/infraestrutura/InfrastructureShared";

export default function InfraRacksPage() {
  const [tenantId, setTenantId] = useState("");
  const [racks, setRacks] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get(`/infraestrutura/racks${qs}`);
      setRacks(Array.isArray(data) ? data : []);
    } catch {
      setRacks([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addRack() {
    if (!tenantId || !name.trim()) return;
    await api.post("/infraestrutura/racks", { tenantId, name, location: location || undefined });
    setName("");
    setLocation("");
    await load();
  }

  return (
    <div className="space-y-4">
      <InfrastructureTenantFilter value={tenantId} onChange={setTenantId} />
      <Card>
        <CardHeader>
          <CardTitle>Racks (estrutura visual — não é patrimônio)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input className="mt-1 text-foreground" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Local</Label>
            <Input className="mt-1 text-foreground" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={() => void addRack()} disabled={!tenantId}>
              Criar rack
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          ) : racks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum rack cadastrado.</p>
          ) : (
            racks.map((rack) => {
              const profiles = (rack.profiles as Array<Record<string, unknown>>) ?? [];
              return (
                <div key={String(rack.id)} className="rounded border p-3">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium">
                      {String(rack.name)}
                      {rack.location ? ` · ${String(rack.location)}` : ""}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => void api.delete(`/infraestrutura/racks/${String(rack.id)}`).then(load)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profiles.length} equipamento(s) posicionado(s)
                  </p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tenant = { id: string; name: string; kind?: { name: string } };

type ActivitySpace = {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
  notes?: string | null;
};

export default function EspacosCadastroPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [spaces, setSpaces] = useState<ActivitySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length === 1) setTenantId(list[0].id);
    });
  }, []);

  const load = useCallback(async () => {
    if (!tenantId) {
      setSpaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<ActivitySpace[]>(
        `/football-activity-spaces?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setSpaces(Array.isArray(data) ? data : []);
    } catch {
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name.trim()) {
      setError("Selecione o clube e informe o nome do espaço.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/football-activity-spaces", {
        tenantId,
        name: name.trim(),
        address: address.trim() || undefined,
      });
      setName("");
      setAddress("");
      await load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(typeof msg === "string" ? msg : "Não foi possível cadastrar o espaço.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Desativar este espaço? Compromissos antigos mantêm o vínculo.")) return;
    await api.delete(`/football-activity-spaces/${id}`);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Espaços</h1>
          <p className="text-sm text-muted-foreground">
            Campos, salas e locais de treino por clube — usados na agenda para conflito de horário entre categorias.
          </p>
        </div>
        <Button variant="outline" asChild className="min-h-[44px]">
          <Link href="/dashboard/futebol/logistica/agenda">Ir para agenda</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clube</CardTitle>
          <CardDescription>Cada clube tem seus próprios espaços (Campo 1, Academia, etc.)</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={tenantId || "none"} onValueChange={(v) => setTenantId(v === "none" ? "" : v)}>
            <SelectTrigger className="min-h-[44px] w-full sm:max-w-md">
              <SelectValue placeholder="Selecione o clube" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione…</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {tenantId ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Novo espaço</CardTitle>
              <CardDescription>Ex.: Campo 1, Campo 2, Sala de reuniões, Fisioterapia</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="space-name">Nome *</Label>
                  <Input
                    id="space-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Campo 1"
                    className="min-h-[44px]"
                  />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="space-address">Endereço / referência</Label>
                  <Input
                    id="space-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>
                {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving} className="min-h-[44px]">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Adicionar espaço
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Espaços cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : spaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum espaço cadastrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spaces.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.address ?? "—"}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-destructive"
                              onClick={() => handleDelete(s.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tenant = { id: string; name: string; kind?: { name: string } };

type ActivitySpace = {
  id: string;
  tenantId: string;
  name: string;
  address?: string | null;
  notes?: string | null;
};

export default function EspacosCadastroPage() {
  const searchParams = useSearchParams();
  const tenantFromUrl = searchParams.get("tenantId") ?? "";
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [spaces, setSpaces] = useState<ActivitySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<ActivitySpace | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivitySpace | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (tenantFromUrl && list.some((t) => t.id === tenantFromUrl)) {
        setTenantId(tenantFromUrl);
      } else if (list.length === 1) {
        setTenantId(list[0].id);
      }
    });
  }, [tenantFromUrl]);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/football-activity-spaces/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (space: ActivitySpace) => {
    setEditTarget(space);
    setEditName(space.name);
    setEditAddress(space.address ?? "");
    setEditError(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) {
      setEditError("Informe o nome do espaço.");
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await api.patch(`/football-activity-spaces/${editTarget.id}`, {
        name: editName.trim(),
        address: editAddress.trim() || null,
      });
      setEditTarget(null);
      await load();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setEditError(typeof msg === "string" ? msg : "Não foi possível salvar as alterações.");
    } finally {
      setEditSaving(false);
    }
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
          <Link href={agendaHubUrl(AGENDA_VISAO.FUTEBOL)}>Ir para agenda</Link>
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
                        <TableHead className="w-24 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {spaces.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{s.address ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                                aria-label={`Editar ${s.name}`}
                                onClick={() => openEdit(s)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive"
                                aria-label={`Excluir ${s.name}`}
                                onClick={() => setDeleteTarget(s)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditSave}>
            <DialogHeader>
              <DialogTitle>Editar espaço</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-space-name">Nome *</Label>
                <Input
                  id="edit-space-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="min-h-[44px] text-foreground"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-space-address">Endereço / referência</Label>
                <Input
                  id="edit-space-address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="min-h-[44px] text-foreground"
                />
              </div>
              {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editSaving || !editName.trim()}>
                {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar espaço?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.name}” será desativado. Compromissos antigos mantêm o vínculo.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? "Desativando…" : "Desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

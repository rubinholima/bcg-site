"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VenueSpace } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

type SpaceForm = {
  name: string;
  capacityStanding: string;
  capacitySeated: string;
  sortOrder: string;
  active: string;
};

const emptyForm = (): SpaceForm => ({
  name: "",
  capacityStanding: "",
  capacitySeated: "",
  sortOrder: "0",
  active: "true",
});

function spaceToForm(space: VenueSpace): SpaceForm {
  return {
    name: space.name,
    capacityStanding: space.capacityStanding != null ? String(space.capacityStanding) : "",
    capacitySeated: space.capacitySeated != null ? String(space.capacitySeated) : "",
    sortOrder: String(space.sortOrder ?? 0),
    active: space.active ? "true" : "false",
  };
}

function formatCapacity(space: VenueSpace): string {
  const parts: string[] = [];
  if (space.capacitySeated != null) parts.push(`${space.capacitySeated} sentados`);
  if (space.capacityStanding != null) parts.push(`${space.capacityStanding} em pé`);
  return parts.length ? parts.join(" · ") : "—";
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseOptionalInt(value: string): number | null | undefined {
  const t = value.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function BostonCityHallSpaces() {
  const [spaces, setSpaces] = useState<VenueSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<SpaceForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState<SpaceForm>(emptyForm());
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<VenueSpace[]>("/boston-city-hall/spaces?all=1");
      setSpaces(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setSpaces([]);
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar os espaços.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const active = spaces.filter((s) => s.active).length;
    return { total: spaces.length, active, inactive: spaces.length - active };
  }, [spaces]);

  const openDetail = async (space: VenueSpace) => {
    setSelectedId(space.id);
    setForm(spaceToForm(space));
    try {
      const res = await api.get<VenueSpace>(`/boston-city-hall/spaces/${space.id}`);
      if (res.data) {
        setForm(spaceToForm(res.data));
      }
    } catch {
      /* mantém dados da lista */
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setForm(null);
  };

  const saveDetail = async () => {
    if (!selectedId || !form) return;
    if (!form.name.trim()) {
      setFeedback({
        open: true,
        title: "Dados incompletos",
        message: "Informe o nome do espaço.",
        variant: "error",
      });
      return;
    }
    const capStand = parseOptionalInt(form.capacityStanding);
    const capSeat = parseOptionalInt(form.capacitySeated);
    if (form.capacityStanding.trim() && capStand === undefined) {
      setFeedback({
        open: true,
        title: "Capacidade inválida",
        message: "Capacidade em pé deve ser um número.",
        variant: "error",
      });
      return;
    }
    if (form.capacitySeated.trim() && capSeat === undefined) {
      setFeedback({
        open: true,
        title: "Capacidade inválida",
        message: "Capacidade sentada deve ser um número.",
        variant: "error",
      });
      return;
    }
    const sortOrder = Number.parseInt(form.sortOrder, 10);
    if (!Number.isFinite(sortOrder)) {
      setFeedback({
        open: true,
        title: "Ordem inválida",
        message: "Ordem de exibição deve ser um número.",
        variant: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.patch<VenueSpace>(`/boston-city-hall/spaces/${selectedId}`, {
        name: form.name.trim(),
        capacityStanding: capStand ?? null,
        capacitySeated: capSeat ?? null,
        sortOrder,
        active: form.active === "true",
      });
      if (res.data) {
        setSpaces((prev) => prev.map((s) => (s.id === res.data!.id ? res.data! : s)));
        setForm(spaceToForm(res.data));
      } else {
        await load();
      }
      setFeedback({
        open: true,
        title: "Espaço atualizado",
        message: "Alterações salvas com sucesso.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Não foi possível salvar o espaço.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setFeedback({
        open: true,
        title: "Dados incompletos",
        message: "Informe o nome do espaço.",
        variant: "error",
      });
      return;
    }
    const capStand = parseOptionalInt(createForm.capacityStanding);
    const capSeat = parseOptionalInt(createForm.capacitySeated);
    const sortOrder = Number.parseInt(createForm.sortOrder, 10) || 0;

    setSaving(true);
    try {
      await api.post("/boston-city-hall/spaces", {
        name: createForm.name.trim(),
        capacityStanding: capStand ?? undefined,
        capacitySeated: capSeat ?? undefined,
        sortOrder,
        active: createForm.active === "true",
      });
      setOpenCreate(false);
      setCreateForm(emptyForm());
      await load();
      setFeedback({
        open: true,
        title: "Espaço cadastrado",
        message: "O ambiente foi adicionado ao venue.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao cadastrar",
        message: e instanceof Error ? e.message : "Não foi possível criar o espaço.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const selected = spaces.find((s) => s.id === selectedId) ?? null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Inativos</p>
            <p className="text-2xl font-bold">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Espaços do venue</CardTitle>
          <Button
            onClick={() => {
              setCreateForm(emptyForm());
              setOpenCreate(true);
            }}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo espaço
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">{loadError}</p>
              <Button variant="outline" onClick={() => load()} className="min-h-[44px]">
                Tentar novamente
              </Button>
            </div>
          ) : spaces.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum espaço cadastrado. Crie o primeiro ambiente.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Capacidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Ordem</TableHead>
                    <TableHead className="hidden lg:table-cell">Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spaces.map((s) => (
                    <TableRow
                      key={s.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40",
                        selectedId === s.id && "bg-muted/30",
                        !s.active && "opacity-75",
                      )}
                      onClick={() => openDetail(s)}
                    >
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.slug}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatCapacity(s)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            s.active
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-zinc-500/20 text-zinc-400",
                          )}
                        >
                          {s.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                        {s.sortOrder}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDateTime(s.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && !loadError ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Espaços inativos não aparecem em novas reservas. Reservas existentes permanecem
              vinculadas.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={!!selected && !!form} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selected && form ? (
            <>
              <DialogHeader>
                <DialogTitle>{form.name || selected.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-1">
                <div className="grid gap-1.5">
                  <Label htmlFor="sp-name">Nome *</Label>
                  <Input
                    id="sp-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="sp-stand">Capacidade em pé</Label>
                    <Input
                      id="sp-stand"
                      inputMode="numeric"
                      value={form.capacityStanding}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, capacityStanding: e.target.value } : f))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sp-seat">Capacidade sentada</Label>
                    <Input
                      id="sp-seat"
                      inputMode="numeric"
                      value={form.capacitySeated}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, capacitySeated: e.target.value } : f))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="sp-order">Ordem de exibição</Label>
                    <Input
                      id="sp-order"
                      inputMode="numeric"
                      value={form.sortOrder}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, sortOrder: e.target.value } : f))
                      }
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sp-active">Status</Label>
                    <NativeSelect
                      id="sp-active"
                      value={form.active}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, active: e.target.value } : f))
                      }
                    >
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Identificador interno</Label>
                  <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {selected.slug}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Criado em {formatDateTime(selected.createdAt)} · Atualizado em{" "}
                  {formatDateTime(selected.updatedAt)}
                </p>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeDetail} className="min-h-[44px]">
                  Fechar
                </Button>
                <Button onClick={saveDetail} disabled={saving} className="min-h-[44px]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo espaço</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="sp-new-name">Nome *</Label>
              <Input
                id="sp-new-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="sp-new-stand">Capacidade em pé</Label>
                <Input
                  id="sp-new-stand"
                  inputMode="numeric"
                  value={createForm.capacityStanding}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, capacityStanding: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sp-new-seat">Capacidade sentada</Label>
                <Input
                  id="sp-new-seat"
                  inputMode="numeric"
                  value={createForm.capacitySeated}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, capacitySeated: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="sp-new-order">Ordem</Label>
                <Input
                  id="sp-new-order"
                  inputMode="numeric"
                  value={createForm.sortOrder}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sp-new-active">Status</Label>
                <NativeSelect
                  id="sp-new-active"
                  value={createForm.active}
                  onChange={(e) => setCreateForm((f) => ({ ...f, active: e.target.value }))}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </NativeSelect>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckSquare, Loader2, Save, Square, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { parseTravelCategoriesFromApi } from "@/lib/travel-categories-utils";
import {
  formatTravelLabel,
  useFutebolRelatorioTenants,
  type FutebolRelatorioTravel,
} from "@/components/dashboard/futebol/relatorios/futebol-relatorio-shared";

interface PlayerRow {
  id: string;
  name: string;
  category?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  registrationProfile?: { sports?: { situation?: string } } | null;
}

interface StaffRow {
  id: string;
  name: string;
  role?: string | null;
  categories?: string[] | null;
}

interface ParticipantRow {
  id: string;
  personType: string;
  playerId?: string | null;
  staffId?: string | null;
  guestName?: string | null;
}

function isInactivePlayer(p: PlayerRow): boolean {
  const s = (p.registrationProfile?.sports?.situation ?? "").toLowerCase();
  return s.includes("arquiv") || s.includes("emprest") || s.includes("emprést");
}

export function LogisticaConvocacaoForm() {
  const searchParams = useSearchParams();
  const initialTravelId = searchParams.get("travelId")?.trim() ?? "";

  const { tenants } = useFutebolRelatorioTenants();
  const { categories: fixtureCats } = useFixtureCategories({ activeOnly: true });

  const [tenantId, setTenantId] = useState("");
  const [travelId, setTravelId] = useState(initialTravelId);
  const [travels, setTravels] = useState<FutebolRelatorioTravel[]>([]);
  const [loadingTravels, setLoadingTravels] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const categoryLabel = useCallback(
    (value: string | null | undefined) => {
      if (!value) return "—";
      return fixtureCats.find((c) => c.value === value)?.labelPT ?? value;
    },
    [fixtureCats],
  );

  useEffect(() => {
    if (tenants.length === 1 && !tenantId) setTenantId(tenants[0]!.id);
  }, [tenants, tenantId]);

  useEffect(() => {
    if (!initialTravelId) return;
    api
      .get<{ tenantId: string }>(`/logistica/${encodeURIComponent(initialTravelId)}`)
      .then(({ data }) => {
        if (data?.tenantId) setTenantId(data.tenantId);
        setTravelId(initialTravelId);
      })
      .catch(() => undefined);
  }, [initialTravelId]);

  useEffect(() => {
    if (!tenantId) {
      setTravels([]);
      return;
    }
    setLoadingTravels(true);
    api
      .get<FutebolRelatorioTravel[]>(
        `/logistica?tenantId=${encodeURIComponent(tenantId)}`,
      )
      .then(({ data }) => {
        const list = (Array.isArray(data) ? data : []).filter(
          (t) => t.status !== "cancelado",
        );
        setTravels(list);
      })
      .catch(() => setTravels([]))
      .finally(() => setLoadingTravels(false));
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setPlayers([]);
      setStaff([]);
      return;
    }
    setLoadingPeople(true);
    Promise.all([
      api.get<PlayerRow[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<StaffRow[]>(
        `/technical-staff?tenantId=${encodeURIComponent(tenantId)}`,
      ),
    ])
      .then(([pRes, sRes]) => {
        setPlayers(
          (Array.isArray(pRes.data) ? pRes.data : []).filter((p) => !isInactivePlayer(p)),
        );
        setStaff(Array.isArray(sRes.data) ? sRes.data : []);
      })
      .catch(() => {
        setPlayers([]);
        setStaff([]);
      })
      .finally(() => setLoadingPeople(false));
  }, [tenantId]);

  const selectedTravel = useMemo(
    () => travels.find((t) => t.id === travelId) ?? null,
    [travels, travelId],
  );

  const travelCategories = useMemo(() => {
    if (!selectedTravel) return [] as string[];
    const parsed = parseTravelCategoriesFromApi(
      selectedTravel.category,
      selectedTravel.categories,
    );
    if (parsed.multiMode) return parsed.list;
    if (parsed.single) return [parsed.single];
    return [];
  }, [selectedTravel]);

  useEffect(() => {
    if (travelCategories.length === 1) {
      setCategoryFilter(travelCategories[0]!);
    } else if (travelCategories.length > 1) {
      setCategoryFilter("travel");
    } else {
      setCategoryFilter("all");
    }
  }, [travelId, travelCategories]);

  const loadParticipants = useCallback(async (id: string) => {
    if (!id) {
      setSelectedPlayerIds(new Set());
      setSelectedStaffIds(new Set());
      return;
    }
    setLoadingParticipants(true);
    try {
      const { data } = await api.get<ParticipantRow[]>(
        `/logistica/${encodeURIComponent(id)}/participants`,
      );
      const list = Array.isArray(data) ? data : [];
      setSelectedPlayerIds(
        new Set(
          list
            .filter((p) => p.personType === "player" && p.playerId)
            .map((p) => p.playerId!),
        ),
      );
      setSelectedStaffIds(
        new Set(
          list
            .filter((p) => p.personType === "staff" && p.staffId)
            .map((p) => p.staffId!),
        ),
      );
    } catch {
      setSelectedPlayerIds(new Set());
      setSelectedStaffIds(new Set());
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  useEffect(() => {
    void loadParticipants(travelId);
  }, [travelId, loadParticipants]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter((p) => {
      if (categoryFilter === "travel") {
        if (travelCategories.length > 0) {
          if (!p.category || !travelCategories.includes(p.category)) return false;
        }
      } else if (categoryFilter !== "all") {
        if (p.category !== categoryFilter) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.position ?? "").toLowerCase().includes(q) ||
        String(p.jerseyNumber ?? "").includes(q)
      );
    });
  }, [players, categoryFilter, travelCategories, search]);

  const filteredStaff = useMemo(() => staff, [staff]);

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisiblePlayers = () => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredPlayers) next.add(p.id);
      return next;
    });
  };

  const clearVisiblePlayers = () => {
    const visible = new Set(filteredPlayers.map((p) => p.id));
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      for (const id of visible) next.delete(id);
      return next;
    });
  };

  const selectAllStaff = () => {
    setSelectedStaffIds(new Set(filteredStaff.map((s) => s.id)));
  };

  const clearAllStaff = () => {
    setSelectedStaffIds(new Set());
  };

  const handleSave = async () => {
    if (!travelId) {
      setFeedback({
        open: true,
        title: "Viagem obrigatória",
        message: "Selecione a viagem antes de salvar a convocação.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const participants = [
        ...[...selectedPlayerIds].map((playerId) => ({
          personType: "player" as const,
          playerId,
        })),
        ...[...selectedStaffIds].map((staffId) => ({
          personType: "staff" as const,
          staffId,
        })),
      ];
      await api.put(`/logistica/${encodeURIComponent(travelId)}/participants`, {
        participants,
      });
      setFeedback({
        open: true,
        title: "Convocação salva",
        message: "Lista atualizada.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: "Não foi possível salvar a convocação. Tente novamente.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const fromTravel = travelCategories.map((v) => ({
      value: v,
      label: categoryLabel(v),
    }));
    const fromFixture = fixtureCats.map((c) => ({
      value: c.value,
      label: c.labelPT,
    }));
    const map = new Map<string, string>();
    for (const o of [...fromTravel, ...fromFixture]) map.set(o.value, o.label);
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [travelCategories, fixtureCats, categoryLabel]);

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-[#C8102E]" />
            Convocação para viagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={tenantId || "none"}
                onValueChange={(v) => {
                  setTenantId(v === "none" ? "" : v);
                  setTravelId("");
                }}
              >
                <SelectTrigger className="min-h-[44px]">
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
            </div>
            <div className="space-y-2">
              <Label>Viagem / jogo</Label>
              <Select
                value={travelId || "none"}
                onValueChange={(v) => setTravelId(v === "none" ? "" : v)}
                disabled={!tenantId || loadingTravels}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue
                    placeholder={loadingTravels ? "Carregando…" : "Selecione a viagem"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {travels.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {formatTravelLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {travelId ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedPlayerIds.size} atleta(s)
              </span>
              {" · "}
              <span className="font-medium text-foreground">
                {selectedStaffIds.size} comissão
              </span>
              {" · "}
              <Link
                href="/dashboard/futebol/logistica/relatorios/passageiros"
                className="text-[#C8102E] underline-offset-2 hover:underline"
              >
                Passageiros
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {travelId ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-zinc-800 bg-zinc-950/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <CardTitle className="text-base">Atletas</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={selectAllVisiblePlayers}
                    disabled={loadingPeople || filteredPlayers.length === 0}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Marcar visíveis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={clearVisiblePlayers}
                    disabled={loadingPeople || filteredPlayers.length === 0}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {travelCategories.length > 1 ? (
                        <SelectItem value="travel">
                          Categorias da viagem (
                          {travelCategories.map(categoryLabel).join(" · ")})
                        </SelectItem>
                      ) : null}
                      <SelectItem value="all">Todas</SelectItem>
                      {categoryOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    placeholder="Nome, posição ou camisa…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {loadingPeople || loadingParticipants ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando elenco…
                </div>
              ) : filteredPlayers.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  Nenhum atleta encontrado com este filtro.
                </p>
              ) : (
                <ul className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto rounded-md border border-zinc-800 p-2">
                  {filteredPlayers.map((p) => {
                    const checked = selectedPlayerIds.has(p.id);
                    return (
                      <li key={p.id}>
                        <label
                          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors ${
                            checked ? "bg-[#C8102E]/15" : "hover:bg-zinc-900"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => togglePlayer(p.id)}
                            aria-label={`Convocar ${p.name}`}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {p.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {p.jerseyNumber != null ? `#${p.jerseyNumber}` : ""}
                            {p.position ? ` · ${p.position}` : ""}
                            {p.category ? ` · ${categoryLabel(p.category)}` : ""}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-950/60">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <CardTitle className="text-base">Comissão técnica</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={selectAllStaff}
                    disabled={loadingPeople || filteredStaff.length === 0}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Marcar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={clearAllStaff}
                    disabled={loadingPeople || selectedStaffIds.size === 0}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPeople ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredStaff.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum membro da comissão neste clube.
                </p>
              ) : (
                <ul className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto rounded-md border border-zinc-800 p-2">
                  {filteredStaff.map((s) => {
                    const checked = selectedStaffIds.has(s.id);
                    return (
                      <li key={s.id}>
                        <label
                          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 py-2 ${
                            checked ? "bg-[#00205B]/30" : "hover:bg-zinc-900"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleStaff(s.id)}
                            aria-label={`Incluir ${s.name}`}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {s.name}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {s.role ?? ""}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-[44px] bg-[#C8102E] text-white hover:bg-[#a00d25]"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar convocação
            </Button>
            <Button type="button" variant="outline" className="min-h-[44px]" asChild>
              <Link href={`/dashboard/futebol/logistica/${travelId}/edit`}>
                Editar viagem
              </Link>
            </Button>
          </div>
        </>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}

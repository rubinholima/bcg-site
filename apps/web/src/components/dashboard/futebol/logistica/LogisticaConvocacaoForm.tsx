"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckSquare, Loader2, Save, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { dateKeyInBrazil } from "@/lib/brazil-time";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { parseTravelCategoriesFromApi } from "@/lib/travel-categories-utils";
import {
  formatTravelLabel,
  useFutebolRelatorioTenants,
  type FutebolRelatorioTravel,
} from "@/components/dashboard/futebol/relatorios/futebol-relatorio-shared";
import {
  formatFixtureOptionLabel,
  mergeTravelsIntoFixturesForConvocation,
  parseTravelRecordFixtureId,
  resolveFixtureOpponentName,
  sortTravelsForConvocation,
  upcomingFixtures,
  type AgendaFixture,
} from "@/lib/travel-fixture-utils";

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
  logisticsGuestId?: string | null;
  guestName?: string | null;
}

interface GuestRow {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
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
  const [rawFixtures, setRawFixtures] = useState<AgendaFixture[]>([]);
  const [fixtures, setFixtures] = useState<AgendaFixture[]>([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [creatingFromFixture, setCreatingFromFixture] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convocationSaved, setConvocationSaved] = useState(false);
  const [onlyWithConvocation, setOnlyWithConvocation] = useState(false);

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
    const fromDate = dateKeyInBrazil(new Date());
    api
      .get<FutebolRelatorioTravel[]>(
        `/logistica?tenantId=${encodeURIComponent(tenantId)}&fromDate=${encodeURIComponent(fromDate)}`,
      )
      .then(({ data }) => {
        const list = (Array.isArray(data) ? data : []).filter(
          (t) => t.status !== "cancelado" && dateKeyInBrazil(t.matchDate) >= fromDate,
        );
        setTravels(sortTravelsForConvocation(list));
      })
      .catch(() => setTravels([]))
      .finally(() => setLoadingTravels(false));
  }, [tenantId]);

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  useEffect(() => {
    if (!tenantId) {
      setRawFixtures([]);
      setFixtures([]);
      setSelectedFixtureId("");
      return;
    }
    setLoadingFixtures(true);
    fetch(`/api/public/tenants/by-id/${encodeURIComponent(tenantId)}/fixtures`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AgendaFixture[]) => {
        setRawFixtures(Array.isArray(data) ? data : []);
      })
      .catch(() => setRawFixtures([]))
      .finally(() => setLoadingFixtures(false));
  }, [tenantId]);

  useEffect(() => {
    const club = selectedTenant?.name ?? "Nosso Clube";
    // Convocação / preparação: só jogos futuros (passados ficam em outra aba depois).
    setFixtures(
      mergeTravelsIntoFixturesForConvocation(
        upcomingFixtures(rawFixtures),
        travels,
        club,
        0,
      ),
    );
  }, [rawFixtures, travels, selectedTenant?.name]);

  const travelsForSelect = useMemo(() => {
    const today = dateKeyInBrazil(new Date());
    const upcoming = travels.filter((t) => dateKeyInBrazil(t.matchDate) >= today);
    if (travelId && !upcoming.some((t) => t.id === travelId)) {
      const current = travels.find((t) => t.id === travelId);
      if (current) return sortTravelsForConvocation([current, ...upcoming]);
    }
    return upcoming;
  }, [travels, travelId]);

  const findTravelForFixture = useCallback(
    (fixture: AgendaFixture, list: FutebolRelatorioTravel[]) => {
      const fromSynthetic = parseTravelRecordFixtureId(fixture.externalId);
      if (fromSynthetic) {
        return list.find((t) => t.id === fromSynthetic) ?? null;
      }
      const byExternal = list.find((t) => t.externalId === fixture.externalId);
      if (byExternal) return byExternal;
      const opponent = resolveFixtureOpponentName(fixture, selectedTenant?.name ?? "");
      const matchDay = fixture.startISO.slice(0, 10);
      return list.find((t) => {
        const sameDay = String(t.matchDate).slice(0, 10) === matchDay;
        const sameOpponent =
          (t.opponentName ?? "").trim().toLowerCase() === opponent.trim().toLowerCase();
        return sameDay && sameOpponent;
      });
    },
    [selectedTenant?.name],
  );

  const handleSelectFixture = async (fixtureId: string) => {
    setSelectedFixtureId(fixtureId);
    if (!fixtureId || !tenantId) return;

    const travelOnlyId = parseTravelRecordFixtureId(fixtureId);
    if (travelOnlyId) {
      setTravelId(travelOnlyId);
      return;
    }

    const fixture = fixtures.find((f) => f.externalId === fixtureId);
    if (!fixture) return;

    const existing = findTravelForFixture(fixture, travels);
    if (existing) {
      setTravelId(existing.id);
      return;
    }

    setCreatingFromFixture(true);
    try {
      const opponentName = resolveFixtureOpponentName(fixture, selectedTenant?.name ?? "");
      const { data } = await api.post<FutebolRelatorioTravel>("/logistica", {
        tenantId,
        matchDate: fixture.startISO.slice(0, 10),
        opponentName: opponentName || undefined,
        stadiumName: fixture.venueName || undefined,
        championshipName: fixture.competitionName || undefined,
        category: fixture.category || undefined,
        isHomeMatch: fixture.isOurTeamHome === true,
        externalId: fixture.externalId,
        status: "planejamento",
      });
      const created = data as FutebolRelatorioTravel;
      setTravels((prev) => sortTravelsForConvocation([...prev, created]));
      setTravelId(created.id);
      setFeedback({
        open: true,
        title: fixture.isOurTeamHome ? "Jogo em casa" : "Jogo registrado",
        message: "Registro criado. Agora marque os convocados e salve.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível preparar a convocação para este jogo.",
        variant: "error",
      });
    } finally {
      setCreatingFromFixture(false);
    }
  };

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

  const isHomeMatch = useMemo(() => {
    if (selectedTravel?.isHomeMatch === true) return true;
    if (selectedTravel?.isHomeMatch === false) return false;
    if (selectedFixtureId) {
      const fixture = fixtures.find((f) => f.externalId === selectedFixtureId);
      if (fixture?.isOurTeamHome === true) return true;
      if (fixture?.isOurTeamHome === false) return false;
    }
    return false;
  }, [selectedTravel, selectedFixtureId, fixtures]);

  useEffect(() => {
    if (!tenantId || isHomeMatch) {
      setGuests([]);
      return;
    }
    setLoadingGuests(true);
    api
      .get<GuestRow[]>(
        `/logistica-cadastros/guests?tenantId=${encodeURIComponent(tenantId)}&activeOnly=true`,
      )
      .then(({ data }) => setGuests(Array.isArray(data) ? data : []))
      .catch(() => setGuests([]))
      .finally(() => setLoadingGuests(false));
  }, [tenantId, isHomeMatch]);

  useEffect(() => {
    if (!travelId || !selectedTravel?.externalId) return;
    setSelectedFixtureId(selectedTravel.externalId);
  }, [travelId, selectedTravel?.externalId]);

  useEffect(() => {
    setConvocationSaved(false);
  }, [travelId]);

  useEffect(() => {
    if (isHomeMatch) setSelectedGuestIds(new Set());
  }, [isHomeMatch]);

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
      setSelectedGuestIds(new Set());
      return;
    }
    setLoadingParticipants(true);
    try {
      const { data } = await api.get<ParticipantRow[]>(
        `/logistica/${encodeURIComponent(id)}/participants`,
      );
      const list = Array.isArray(data) ? data : [];
      const playersSel = new Set(
        list
          .filter((p) => p.personType === "player" && p.playerId)
          .map((p) => p.playerId!),
      );
      const staffSel = new Set(
        list
          .filter((p) => p.personType === "staff" && p.staffId)
          .map((p) => p.staffId!),
      );
      const guestsSel = new Set(
        list
          .filter((p) => p.personType === "guest" && p.logisticsGuestId)
          .map((p) => p.logisticsGuestId!),
      );
      setSelectedPlayerIds(playersSel);
      setSelectedStaffIds(staffSel);
      setSelectedGuestIds(guestsSel);
      setConvocationSaved(playersSel.size + staffSel.size + guestsSel.size > 0);
    } catch {
      setSelectedPlayerIds(new Set());
      setSelectedStaffIds(new Set());
      setSelectedGuestIds(new Set());
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

  const toggleGuest = (id: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllGuests = () => {
    setSelectedGuestIds(new Set(guests.map((g) => g.id)));
  };

  const clearAllGuests = () => {
    setSelectedGuestIds(new Set());
  };

  const handleSave = async () => {
    if (!travelId) {
      setFeedback({
        open: true,
        title: "Jogo obrigatório",
        message: "Selecione o jogo antes de salvar a convocação.",
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
        ...(isHomeMatch
          ? []
          : [...selectedGuestIds].map((logisticsGuestId) => ({
              personType: "guest" as const,
              logisticsGuestId,
            }))),
      ];
      await api.put(`/logistica/${encodeURIComponent(travelId)}/participants`, {
        participants,
      });
      setConvocationSaved(true);
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

  const convokedPlayerNames = useMemo(
    () =>
      [...selectedPlayerIds]
        .map((id) => players.find((p) => p.id === id)?.name)
        .filter(Boolean) as string[],
    [selectedPlayerIds, players],
  );

  const convokedStaffNames = useMemo(
    () =>
      [...selectedStaffIds]
        .map((id) => staff.find((s) => s.id === id)?.name)
        .filter(Boolean) as string[],
    [selectedStaffIds, staff],
  );

  const convokedGuestNames = useMemo(
    () =>
      [...selectedGuestIds]
        .map((id) => guests.find((g) => g.id === id)?.name)
        .filter(Boolean) as string[],
    [selectedGuestIds, guests],
  );

  const travelSummaryLabel = selectedTravel ? formatTravelLabel(selectedTravel) : "";

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800 bg-zinc-950/60">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={tenantId || "none"}
                onValueChange={(v) => {
                  setTenantId(v === "none" ? "" : v);
                  setTravelId("");
                  setSelectedFixtureId("");
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
          </div>

          {tenantId ? (
            <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <Label>Jogo da agenda</Label>
              <Select
                value={selectedFixtureId || "none"}
                onValueChange={(v) => void handleSelectFixture(v === "none" ? "" : v)}
                disabled={loadingFixtures || creatingFromFixture}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue
                    placeholder={
                      loadingFixtures
                        ? "Carregando jogos…"
                        : fixtures.length === 0
                          ? "Nenhum jogo futuro na agenda"
                          : "Selecione o jogo"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {fixtures.map((f) => (
                    <SelectItem key={f.externalId} value={f.externalId}>
                      {formatFixtureOptionLabel(f, selectedTenant?.name ?? "Nosso Clube")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Ou selecione um registro existente</Label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={onlyWithConvocation}
                    onCheckedChange={(v) => setOnlyWithConvocation(v === true)}
                  />
                  Só com convocação
                </label>
              </div>
              <Select
                value={travelId || "none"}
                onValueChange={(v) => {
                  setTravelId(v === "none" ? "" : v);
                  setSelectedFixtureId("");
                }}
                disabled={!tenantId || loadingTravels}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue
                    placeholder={loadingTravels ? "Carregando…" : "Registros de jogos / viagens"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {travelsForSelect
                    .filter((t) => {
                      if (!onlyWithConvocation) return true;
                      const n = t._count?.participants ?? 0;
                      return n > 0;
                    })
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {formatTravelLabel(t)}
                        {(t._count?.participants ?? 0) > 0
                          ? ` · ${t._count!.participants} convocados`
                          : ""}
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
              {!isHomeMatch ? (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">
                    {selectedGuestIds.size} pessoa(s) autorizada(s)
                  </span>
                  {" · "}
                  <Link
                    href="/dashboard/futebol/logistica/relatorios/passageiros"
                    className="text-[#C8102E] underline-offset-2 hover:underline"
                  >
                    Passageiros
                  </Link>
                </>
              ) : null}
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
                          {isHomeMatch ? "Categorias do jogo" : "Categorias da viagem"} (
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

          {!isHomeMatch ? (
          <Card className="border-zinc-800 bg-zinc-950/60 lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <CardTitle className="text-base">Pessoas autorizadas</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={selectAllGuests}
                    disabled={loadingGuests || guests.length === 0}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Marcar todos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={clearAllGuests}
                    disabled={selectedGuestIds.size === 0}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Limpar
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="min-h-[44px]" asChild>
                    <Link href={`/dashboard/futebol/logistica/cadastros/convidados?tenantId=${tenantId}`}>
                      Cadastrar pessoa autorizada
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingGuests ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Carregando pessoas autorizadas…
                </div>
              ) : guests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma pessoa autorizada cadastrada para este clube. Use &quot;Cadastrar pessoa autorizada&quot; ou
                  Logística → Cadastros → Pessoas autorizadas.
                </p>
              ) : (
                <ul className="max-h-[min(280px,40vh)] space-y-1 overflow-y-auto rounded-md border border-zinc-800 p-2">
                  {guests.map((g) => {
                    const checked = selectedGuestIds.has(g.id);
                    return (
                      <li key={g.id}>
                        <label
                          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 py-2 ${
                            checked ? "bg-amber-500/15" : "hover:bg-zinc-900"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleGuest(g.id)}
                            aria-label={`Convocar ${g.name}`}
                          />
                          <span className="min-w-0 flex-1 truncate font-medium">{g.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {[g.cpf, g.phone].filter(Boolean).join(" · ")}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
          ) : null}

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
                Editar planejamento
              </Link>
            </Button>
          </div>

          {convocationSaved && selectedTravel && !loadingParticipants ? (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-green-400">Convocação registrada</CardTitle>
                <CardDescription>{travelSummaryLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Atletas</p>
                    <p className="text-lg font-semibold tabular-nums">{convokedPlayerNames.length}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Comissão</p>
                    <p className="text-lg font-semibold tabular-nums">{convokedStaffNames.length}</p>
                  </div>
                  {!isHomeMatch ? (
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Pessoas autorizadas</p>
                      <p className="text-lg font-semibold tabular-nums">{convokedGuestNames.length}</p>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Local</p>
                    <p className="text-lg font-semibold">{isHomeMatch ? "Casa" : "Fora"}</p>
                  </div>
                </div>

                {convokedPlayerNames.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Atletas convocados
                    </p>
                    <p className="text-foreground">{convokedPlayerNames.join(" · ")}</p>
                  </div>
                ) : null}

                {convokedStaffNames.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Comissão
                    </p>
                    <p className="text-foreground">{convokedStaffNames.join(" · ")}</p>
                  </div>
                ) : null}

                {!isHomeMatch && convokedGuestNames.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pessoas autorizadas
                    </p>
                    <p className="text-foreground">{convokedGuestNames.join(" · ")}</p>
                  </div>
                ) : null}

                {!isHomeMatch ? (
                  <Link
                    href="/dashboard/futebol/logistica/relatorios/passageiros"
                    className="inline-flex text-sm text-[#C8102E] underline-offset-2 hover:underline"
                  >
                    Ver relatório de passageiros
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
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

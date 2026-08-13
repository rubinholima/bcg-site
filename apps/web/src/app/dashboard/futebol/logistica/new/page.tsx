"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { parseDateTimeLocalBrazil } from "@/lib/brazil-time";
import { namesMatch } from "@/lib/names-match";
import { fetchVisitingTeamsMergedWithS3 } from "@/lib/visiting-teams-merge";
import { isFootballKind } from "@/lib/home-data";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import { RoomAssignmentTable, type RoomAssignment } from "../components/RoomAssignmentTable";
import {
  formatFixtureOptionLabel,
  resolveFixtureOpponentName,
  upcomingFixtures,
  type AgendaFixture,
} from "@/lib/travel-fixture-utils";
import {
  TravelCategoriesField,
  travelCategoriesPayload,
} from "@/components/dashboard/futebol/TravelCategoriesField";
import {
  LogisticaTravelCadastrosFields,
} from "@/components/dashboard/futebol/logistica/LogisticaTravelCadastrosFields";
import { LogisticaItineraryFields } from "@/components/dashboard/futebol/logistica/LogisticaItineraryFields";
import { LogisticaExpenseLinesFields } from "@/components/dashboard/futebol/logistica/LogisticaExpenseLinesFields";
import {
  EMPTY_LOGISTICS_TRAVEL_CADASTROS,
  type LogisticsExpenseLine,
  type LogisticsTravelCadastros,
} from "@/lib/logistica-travel-cadastros.types";
import {
  EMPTY_TRAVEL_HOTEL_STAY,
  EMPTY_TRAVEL_ITINERARY,
  EMPTY_TRAVEL_UNIFORMS,
  serializeTravelHotelStay,
  serializeTravelItinerary,
  serializeTravelUniforms,
  type TravelHotelStay,
  type TravelItinerary,
  type TravelUniforms,
} from "@/lib/travel-itinerary.types";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  kind?: { id: string; name: string };
  categories?: string[] | null;
}

interface FixtureItem extends AgendaFixture {}

interface Championship {
  id: string;
  name: string;
}

interface Stadium {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
}

interface VisitingTeam {
  id: string;
  name: string;
}

function isClubForLogistica(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (!isFootballKind(kindName)) return false;
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

const TRANSPORT_OPTIONS = [
  { value: "aereo_comercial", label: "Aéreo comercial" },
  { value: "aereo_fretado", label: "Aéreo fretado" },
  { value: "rodoviario", label: "Rodoviário" },
  { value: "misto", label: "Misto" },
];

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "planejamento", label: "Planejamento" },
  { value: "aprovado", label: "Aprovado" },
];

export default function NewLogisticaPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [visitingTeams, setVisitingTeams] = useState<VisitingTeam[]>([]);
  const [upcomingFixturesList, setUpcomingFixturesList] = useState<FixtureItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dataSource, setDataSource] = useState<"fixture" | "manual">("fixture");
  const [tenantId, setTenantId] = useState("");
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [category, setCategory] = useState("");
  const [multiCategoryMode, setMultiCategoryMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [matchDate, setMatchDate] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [stadiumName, setStadiumName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [championshipName, setChampionshipName] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [transportType, setTransportType] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [estimatedDeparture, setEstimatedDeparture] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelAddress, setHotelAddress] = useState("");
  const [isHomeMatch, setIsHomeMatch] = useState(false);
  const [itinerary, setItinerary] = useState<TravelItinerary>(EMPTY_TRAVEL_ITINERARY);
  const [hotelStay, setHotelStay] = useState<TravelHotelStay>(EMPTY_TRAVEL_HOTEL_STAY);
  const [uniforms, setUniforms] = useState<TravelUniforms>(EMPTY_TRAVEL_UNIFORMS);
  const [logisticsCadastros, setLogisticsCadastros] =
    useState<LogisticsTravelCadastros>(EMPTY_LOGISTICS_TRAVEL_CADASTROS);
  const [pointOfInterestIds, setPointOfInterestIds] = useState<string[]>([]);
  const [expenseLines, setExpenseLines] = useState<LogisticsExpenseLine[]>([]);
  const [accommodationRooms, setAccommodationRooms] = useState<RoomAssignment[]>([]);
  const [nutritionApprovedBy, setNutritionApprovedBy] = useState("");
  const [estimatedCostTotal, setEstimatedCostTotal] = useState("");
  const [weatherForecast, setWeatherForecast] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("rascunho");

  const refreshChampionships = useCallback(async () => {
    try {
      const { data } = await api.get<Championship[]>("/championships");
      setChampionships(Array.isArray(data) ? data : []);
    } catch {
      /* mantém lista anterior */
    }
  }, []);

  const refreshStadiums = useCallback(async () => {
    try {
      const { data } = await api.get<Stadium[]>("/stadiums");
      setStadiums(Array.isArray(data) ? data : []);
    } catch {
      /* mantém lista anterior */
    }
  }, []);

  const refreshVisitingTeams = useCallback(async () => {
    try {
      const list = await fetchVisitingTeamsMergedWithS3();
      setVisitingTeams(list);
    } catch {
      /* mantém lista anterior */
    }
  }, []);

  const refreshLogisticaCadastros = useCallback(async () => {
    try {
      const [cRes, sRes, vMerged] = await Promise.all([
        api.get<Championship[]>("/championships"),
        api.get<Stadium[]>("/stadiums"),
        fetchVisitingTeamsMergedWithS3(),
      ]);
      setChampionships(Array.isArray(cRes.data) ? cRes.data : []);
      setStadiums(Array.isArray(sRes.data) ? sRes.data : []);
      setVisitingTeams(vMerged);
    } catch {
      /* mantém listas anteriores */
    }
  }, []);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list.filter((t) => isClubForLogistica(t.kind?.name)));
    });
    Promise.all([
      api.get<Championship[]>("/championships"),
      api.get<Stadium[]>("/stadiums"),
      fetchVisitingTeamsMergedWithS3(),
    ]).then(([cRes, sRes, vMerged]) => {
      setChampionships(Array.isArray(cRes.data) ? cRes.data : []);
      setStadiums(Array.isArray(sRes.data) ? sRes.data : []);
      setVisitingTeams(vMerged);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshLogisticaCadastros();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshLogisticaCadastros]);

  const selectedTenant = tenants.find((t) => t.id === tenantId);

  const opponentValueForSelect =
    opponentName.trim() === ""
      ? ""
      : visitingTeams.find((t) => namesMatch(t.name, opponentName))?.name ?? opponentName;

  const stadiumValueForSelect =
    stadiumName.trim() === ""
      ? ""
      : stadiums.find((s) => namesMatch(s.name, stadiumName))?.name ?? stadiumName;

  const championshipValueForSelect =
    championshipName.trim() === ""
      ? ""
      : championships.find((c) => namesMatch(c.name, championshipName))?.name ?? championshipName;

  useEffect(() => {
    if (!tenantId || dataSource !== "fixture") {
      setUpcomingFixturesList([]);
      return;
    }
    fetch(`/api/public/tenants/by-id/${encodeURIComponent(tenantId)}/fixtures`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: FixtureItem[]) => {
        const list = Array.isArray(data) ? data : [];
        setUpcomingFixturesList(upcomingFixtures(list));
        setSelectedFixtureId("");
      })
      .catch(() => setUpcomingFixturesList([]));
  }, [tenantId, dataSource]);

  useEffect(() => {
    if (selectedFixtureId && dataSource === "fixture") {
      const f = upcomingFixturesList.find((x) => x.externalId === selectedFixtureId);
      if (f) {
        setMatchDate(f.startISO.slice(0, 10));
        setOpponentName(resolveFixtureOpponentName(f, selectedTenant?.name ?? ""));
        setStadiumName(f.venueName || "");
        setChampionshipName(f.competitionName || "");
        setCategory(f.category || "");
        setIsHomeMatch(f.isOurTeamHome === true);
        const stadium = stadiums.find((s) => s.name === f.venueName);
        if (stadium) {
          if (stadium.city) setCity(stadium.city);
          if (stadium.country) setCountry(stadium.country);
        }
      }
    }
  }, [selectedFixtureId, dataSource, upcomingFixturesList, stadiums, selectedTenant?.name]);

  const { categories: categoriesForDropdown } = useCategoriesForTenant(
    selectedTenant?.categories,
  );

  const filteredFixtures =
    dataSource === "fixture"
      ? category
        ? upcomingFixturesList.filter((f) => (f.category || "principal") === category)
        : upcomingFixturesList
      : upcomingFixturesList;

  const selectedFixture = upcomingFixturesList.find((f) => f.externalId === selectedFixtureId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId.trim() || !matchDate.trim()) {
      setError("Clube e data do jogo são obrigatórios.");
      return;
    }
    setLoading(true);
    setError(null);

    const roomsPayload = accommodationRooms
      .filter((r) => r.roomNumber.trim())
      .map((r) => ({
        roomNumber: r.roomNumber.trim(),
        roomTypeId: r.roomTypeId || undefined,
        roomTypeName: r.roomTypeName || undefined,
        occupants: r.occupants.filter((o) => o.personName.trim()),
      }));

    try {
      const { data } = await api.post<{ id: string }>("/logistica", {
        tenantId,
        ...travelCategoriesPayload(multiCategoryMode, category, selectedCategories),
        matchDate: matchDate.trim(),
        isHomeMatch,
        itinerary: serializeTravelItinerary(itinerary),
        hotelStay: serializeTravelHotelStay(hotelStay),
        uniforms: serializeTravelUniforms(uniforms),
        externalId: selectedFixture?.externalId,
        opponentName: opponentName.trim() || undefined,
        stadiumName: stadiumName.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        championshipName: championshipName.trim() || undefined,
        distanceKm: distanceKm.trim() ? Number(distanceKm) : undefined,
        transportType: transportType.trim() || undefined,
        transportDetails: transportDetails.trim() || undefined,
        estimatedDeparture: parseDateTimeLocalBrazil(estimatedDeparture.trim()) ?? undefined,
        estimatedArrival: parseDateTimeLocalBrazil(estimatedArrival.trim()) ?? undefined,
        hotelName: hotelName.trim() || undefined,
        hotelAddress: hotelAddress.trim() || undefined,
        logisticsCadastros,
        expenseLines: expenseLines.length ? expenseLines : undefined,
        pointOfInterestIds: pointOfInterestIds.length ? pointOfInterestIds : undefined,
        accommodationRooms: roomsPayload.length ? roomsPayload : undefined,
        nutritionApprovedBy: nutritionApprovedBy.trim() || undefined,
        estimatedCostTotal: estimatedCostTotal.trim() ? Number(estimatedCostTotal.replace(",", ".")) : undefined,
        weatherForecast: weatherForecast.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
      if (data?.id) {
        markSaveSuccessForNavigation();
        router.replace(`/dashboard/futebol/logistica/${data.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar planejamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-0 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <Button type="submit" form="form-logistica-new" disabled={loading}>
          {loading ? "Criando..." : "Criar e editar"}
        </Button>
      </div>

      <form id="form-logistica-new" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Jogo</CardTitle>
            <CardDescription>
              Escolha um jogo da agenda (casa ou fora) ou preencha manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tenantId">Clube *</Label>
                <Select required value={tenantId} onValueChange={(v) => { setTenantId(v); setSelectedFixtureId(""); setCategory(""); }}>
                  <SelectTrigger id="tenantId">
                    <SelectValue placeholder="Selecione o clube" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {dataSource === "fixture" && (
                <div className="space-y-2">
                  <Label htmlFor="categoryFilter">Categoria</Label>
                  <Select
                    value={category || "none"}
                    onValueChange={(v) => { setCategory(v === "none" ? "" : v); setSelectedFixtureId(""); }}
                  >
                    <SelectTrigger id="categoryFilter">
                      <SelectValue placeholder="Todas (casa e fora)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todas</SelectItem>
                      {categoriesForDropdown.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.labelPT}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Filtra por categoria. Deixe &quot;Todas&quot; para ver todos os próximos jogos.
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Fonte dos dados</Label>
                <Select value={dataSource} onValueChange={(v: "fixture" | "manual") => { setDataSource(v); setSelectedFixtureId(""); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixture">Próximos jogos (casa e fora)</SelectItem>
                    <SelectItem value="manual">Preencher manualmente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dataSource === "fixture" && tenantId && (
              <div className="space-y-2">
                <Label>Selecione o jogo</Label>
                <Select value={selectedFixtureId || "none"} onValueChange={(v) => setSelectedFixtureId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={filteredFixtures.length === 0 ? "Nenhum jogo futuro" : "Selecione o jogo"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {filteredFixtures.map((f) => (
                      <SelectItem key={f.externalId} value={f.externalId}>
                        {formatFixtureOptionLabel(f, selectedTenant?.name ?? "Nosso Clube")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#C8102E]"
                checked={isHomeMatch}
                onChange={(e) => setIsHomeMatch(e.target.checked)}
              />
              Jogo em casa
            </label>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="matchDate">Data do jogo *</Label>
                <Input
                  id="matchDate"
                  type="date"
                  required
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opponentName">Adversário</Label>
                <Select
                  value={opponentValueForSelect || "none"}
                  onValueChange={(v) => setOpponentName(v === "none" ? "" : v)}
                  onOpenChange={(open) => {
                    if (open) void refreshVisitingTeams();
                  }}
                >
                  <SelectTrigger id="opponentName">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {opponentName && !visitingTeams.some((t) => namesMatch(t.name, opponentName)) && (
                      <SelectItem value={opponentName}>{opponentName}</SelectItem>
                    )}
                    {visitingTeams.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stadiumName">Estádio</Label>
                <Select
                  value={stadiumValueForSelect || "none"}
                  onOpenChange={(open) => {
                    if (open) void refreshStadiums();
                  }}
                  onValueChange={(v) => {
                  setStadiumName(v === "none" ? "" : v);
                  const s = stadiums.find((x) => x.name === v);
                  if (s) {
                    setCity(s.city ?? "");
                    setCountry(s.country ?? "");
                  } else {
                    setCity("");
                    setCountry("");
                  }
                }}
                >
                  <SelectTrigger id="stadiumName">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {stadiumName && !stadiums.some((s) => namesMatch(s.name, stadiumName)) && (
                      <SelectItem value={stadiumName}>{stadiumName}</SelectItem>
                    )}
                    {stadiums.map((s) => (
                      <SelectItem key={s.id} value={s.name}>{s.name}{s.city ? ` (${s.city})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="championshipName">Competição</Label>
                <Select
                  value={championshipValueForSelect || "none"}
                  onOpenChange={(open) => {
                    if (open) void refreshChampionships();
                  }}
                  onValueChange={(v) => setChampionshipName(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="championshipName">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {championshipName && !championships.some((c) => namesMatch(c.name, championshipName)) && (
                      <SelectItem value={championshipName}>{championshipName}</SelectItem>
                    )}
                    {championships.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TravelCategoriesField
              isHomeMatch={isHomeMatch}
              categoriesForDropdown={categoriesForDropdown}
              multiMode={multiCategoryMode}
              onMultiModeChange={setMultiCategoryMode}
              singleCategory={category}
              onSingleCategoryChange={setCategory}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={setSelectedCategories}
            />
            {stadiumName && (city || country) && (
              <p className="text-sm text-muted-foreground">
                Local: {[city, country].filter(Boolean).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {!isHomeMatch ? (
        <Card>
          <CardHeader>
            <CardTitle>Transporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="distanceKm">Distância (km)</Label>
                <Input id="distanceKm" type="number" min={0} step={1} value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="Ex.: 450" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportType">Tipo de transporte</Label>
                <Select value={transportType || "none"} onValueChange={(v) => setTransportType(v === "none" ? "" : v)}>
                  <SelectTrigger id="transportType">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {TRANSPORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedDeparture">Saída prevista</Label>
                <Input id="estimatedDeparture" type="datetime-local" value={estimatedDeparture} onChange={(e) => setEstimatedDeparture(e.target.value)} className="text-foreground" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedArrival">Chegada prevista</Label>
                <Input id="estimatedArrival" type="datetime-local" value={estimatedArrival} onChange={(e) => setEstimatedArrival(e.target.value)} className="text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportDetails">Detalhes do transporte</Label>
              <Textarea id="transportDetails" value={transportDetails} onChange={(e) => setTransportDetails(e.target.value)} placeholder="Voos, horários, números de reserva..." rows={3} />
            </div>
            <LogisticaTravelCadastrosFields
              variant="destination"
              transportType={transportType}
              logisticsCadastros={logisticsCadastros}
              onLogisticsCadastrosChange={setLogisticsCadastros}
              hotelName={hotelName}
              hotelAddress={hotelAddress}
              onHotelNameChange={setHotelName}
              onHotelAddressChange={setHotelAddress}
              onDestinationNameChange={(name) => setCity(name)}
              tenantId={tenantId}
              disabled={loading}
            />
            <LogisticaTravelCadastrosFields
              variant="transport"
              transportType={transportType}
              logisticsCadastros={logisticsCadastros}
              onLogisticsCadastrosChange={setLogisticsCadastros}
              hotelName={hotelName}
              hotelAddress={hotelAddress}
              onHotelNameChange={setHotelName}
              onHotelAddressChange={setHotelAddress}
              tenantId={tenantId}
              disabled={loading}
            />
          </CardContent>
        </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{isHomeMatch ? "Agenda do jogo" : "Itinerário e uniformes"}</CardTitle>
          </CardHeader>
          <CardContent>
            <LogisticaItineraryFields
              isHomeMatch={isHomeMatch}
              matchDate={matchDate}
              itinerary={itinerary}
              hotelStay={hotelStay}
              uniforms={uniforms}
              onItineraryChange={setItinerary}
              onHotelStayChange={setHotelStay}
              onUniformsChange={setUniforms}
              disabled={loading}
            />
          </CardContent>
        </Card>

        {!isHomeMatch ? (
        <Card>
          <CardHeader>
            <CardTitle>Hospedagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogisticaTravelCadastrosFields
              variant="hotel"
              transportType={transportType}
              logisticsCadastros={logisticsCadastros}
              onLogisticsCadastrosChange={setLogisticsCadastros}
              hotelName={hotelName}
              hotelAddress={hotelAddress}
              onHotelNameChange={setHotelName}
              onHotelAddressChange={setHotelAddress}
              pointOfInterestIds={pointOfInterestIds}
              onPointOfInterestIdsChange={setPointOfInterestIds}
              tenantId={tenantId}
              disabled={loading}
            />
            {tenantId && (
              <RoomAssignmentTable
                tenantId={tenantId}
                value={accommodationRooms}
                onChange={setAccommodationRooms}
                disabled={loading}
              />
            )}
          </CardContent>
        </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Nutrição e custos</CardTitle>
            <CardDescription>Aval do depto de nutrição, despesas por cadastro e custo total.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nutritionApprovedBy">Aprovado por (nutrição)</Label>
                <Input id="nutritionApprovedBy" value={nutritionApprovedBy} onChange={(e) => setNutritionApprovedBy(e.target.value)} placeholder="Nome do nutricionista que aprovou" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCostTotal">Custo total estimado (R$)</Label>
                <Input id="estimatedCostTotal" type="text" inputMode="decimal" value={estimatedCostTotal} onChange={(e) => setEstimatedCostTotal(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <LogisticaExpenseLinesFields
              lines={expenseLines}
              onChange={setExpenseLines}
              defaultPaymentTypeId={logisticsCadastros.paymentTypeId}
              defaultSupplierId={logisticsCadastros.supplierId}
              tenantId={tenantId}
              disabled={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status e observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weatherForecast">Previsão do tempo</Label>
                <Input id="weatherForecast" value={weatherForecast} onChange={(e) => setWeatherForecast(e.target.value)} placeholder="Ex.: 25°C, tempo aberto" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Outras observações" rows={4} />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

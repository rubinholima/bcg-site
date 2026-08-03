"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
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
import { namesMatch } from "@/lib/names-match";
import { fetchVisitingTeamsMergedWithS3 } from "@/lib/visiting-teams-merge";
import { isFootballKind } from "@/lib/home-data";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { RoomAssignmentTable, type RoomAssignment } from "../../components/RoomAssignmentTable";
import {
  TravelCategoriesField,
  parseTravelCategoriesFromApi,
  travelCategoriesPayload,
} from "@/components/dashboard/futebol/TravelCategoriesField";
import { LogisticaTravelCadastrosFields } from "@/components/dashboard/futebol/logistica/LogisticaTravelCadastrosFields";
import { LogisticaExpenseLinesFields } from "@/components/dashboard/futebol/logistica/LogisticaExpenseLinesFields";
import {
  EMPTY_LOGISTICS_TRAVEL_CADASTROS,
  parseLogisticsExpenseLines,
  parseLogisticsTravelCadastros,
  parsePointOfInterestIds,
  type LogisticsExpenseLine,
  type LogisticsTravelCadastros,
} from "@/lib/logistica-travel-cadastros.types";

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

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  kind?: { id: string; name: string };
  categories?: string[] | null;
}

interface TravelLogisticsItem {
  id: string;
  tenantId: string;
  category?: string | null;
  categories?: string[] | null;
  matchDate: string;
  opponentName?: string | null;
  stadiumName?: string | null;
  city?: string | null;
  country?: string | null;
  championshipName?: string | null;
  distanceKm?: number | null;
  transportType?: string | null;
  transportDetails?: string | null;
  estimatedDeparture?: string | null;
  estimatedArrival?: string | null;
  hotelName?: string | null;
  hotelAddress?: string | null;
  accommodationRooms?: RoomAssignment[] | null;
  beatscodeMeta?: unknown;
  nutritionApprovedAt?: string | null;
  nutritionApprovedBy?: string | null;
  estimatedCostTotal?: number | null;
  status: string;
  weatherForecast?: string | null;
  notes?: string | null;
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
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

function toDateInput(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  return d.toISOString().slice(0, 10);
}

function toDateTimeLocal(v: string | Date | null | undefined): string {
  if (!v) return "";
  const d = typeof v === "string" ? new Date(v) : v;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditLogisticaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<TravelLogisticsItem | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [visitingTeams, setVisitingTeams] = useState<VisitingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!id) return;
    api.get<TravelLogisticsItem>(`/logistica/${id}`).then(({ data }) => {
      setItem(data ?? null);
      if (data) {
        const parsed = parseTravelCategoriesFromApi(data.category, data.categories);
        setMultiCategoryMode(parsed.multiMode);
        setCategory(parsed.single);
        setSelectedCategories(parsed.list);
        setMatchDate(toDateInput(data.matchDate));
        setOpponentName(data.opponentName ?? "");
        setStadiumName(data.stadiumName ?? "");
        setCity(data.city ?? "");
        setCountry(data.country ?? "");
        setChampionshipName(data.championshipName ?? "");
        setDistanceKm(data.distanceKm != null ? String(data.distanceKm) : "");
        setTransportType(data.transportType ?? "");
        setTransportDetails(data.transportDetails ?? "");
        setEstimatedDeparture(toDateTimeLocal(data.estimatedDeparture));
        setEstimatedArrival(toDateTimeLocal(data.estimatedArrival));
        setHotelName(data.hotelName ?? "");
        setHotelAddress(data.hotelAddress ?? "");
        setLogisticsCadastros(parseLogisticsTravelCadastros(data.beatscodeMeta));
        setExpenseLines(parseLogisticsExpenseLines(data.beatscodeMeta));
        setPointOfInterestIds(parsePointOfInterestIds(data.beatscodeMeta));
        setAccommodationRooms(
          Array.isArray(data.accommodationRooms)
            ? (data.accommodationRooms as Array<{
                roomNumber?: string;
                roomTypeId?: string;
                roomTypeName?: string;
                occupants?: unknown[];
              }>).map((r) => ({
                roomNumber: r.roomNumber ?? "",
                roomTypeId: r.roomTypeId,
                roomTypeName: r.roomTypeName,
                occupants: Array.isArray(r.occupants)
                  ? r.occupants.map((o) => {
                      const oc = o as { personId?: string; personName?: string; personType?: string };
                      return {
                        personId: oc.personId,
                        personName: oc.personName ?? "",
                        personType: (oc.personType === "staff" ? "staff" : "player") as "player" | "staff",
                      };
                    })
                  : [],
              }))
            : []
        );
        setNutritionApprovedBy(data.nutritionApprovedBy ?? "");
        setEstimatedCostTotal(data.estimatedCostTotal != null ? String(data.estimatedCostTotal) : "");
        setWeatherForecast(data.weatherForecast ?? "");
        setNotes(data.notes ?? "");
        setStatus(data.status ?? "rascunho");
      }
    }).catch(() => setItem(null)).finally(() => setLoading(false));
  }, [id]);

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

  const selectedTenant = tenants.find((t) => t.id === item?.tenantId);
  const categoriesForDropdown = selectedTenant?.categories?.length
    ? FIXTURE_CATEGORIES.filter((c) => selectedTenant.categories!.includes(c.value))
    : FIXTURE_CATEGORIES;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);

    try {
      await api.patch(`/logistica/${id}`, {
        ...travelCategoriesPayload(multiCategoryMode, category, selectedCategories),
        matchDate: matchDate.trim(),
        opponentName: opponentName.trim() || undefined,
        stadiumName: stadiumName.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        championshipName: championshipName.trim() || undefined,
        distanceKm: distanceKm.trim() ? Number(distanceKm) : undefined,
        transportType: transportType.trim() || undefined,
        transportDetails: transportDetails.trim() || undefined,
        estimatedDeparture: estimatedDeparture.trim() || undefined,
        estimatedArrival: estimatedArrival.trim() || undefined,
        hotelName: hotelName.trim() || undefined,
        hotelAddress: hotelAddress.trim() || undefined,
        logisticsCadastros,
        expenseLines,
        pointOfInterestIds,
        accommodationRooms: accommodationRooms.filter((r) => r.roomNumber.trim()).length
          ? accommodationRooms.filter((r) => r.roomNumber.trim()).map((r) => ({
              roomNumber: r.roomNumber.trim(),
              roomTypeId: r.roomTypeId || undefined,
              roomTypeName: r.roomTypeName || undefined,
              occupants: r.occupants.filter((o) => o.personName.trim()),
            }))
          : undefined,
        nutritionApprovedBy: nutritionApprovedBy.trim() || undefined,
        estimatedCostTotal: estimatedCostTotal.trim() ? Number(estimatedCostTotal.replace(",", ".")) : undefined,
        weatherForecast: weatherForecast.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      });
      router.push("/dashboard/futebol/logistica?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setSaving(false);
    }
  };

  if (loading || !item) {
    return (
      <div className="flex items-center justify-center py-12">
        {loading ? "Carregando..." : "Planejamento não encontrado."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-0 mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <Button type="submit" form="form-logistica-edit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/futebol/logistica/convocacao?travelId=${id}`}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Convocação
            </Link>
          </Button>
        </div>
      </div>

      <form id="form-logistica-edit" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Jogo</CardTitle>
            <CardDescription>Clube: {tenants.find((t) => t.id === item.tenantId)?.name ?? item.tenantId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TravelCategoriesField
              categoriesForDropdown={categoriesForDropdown}
              multiMode={multiCategoryMode}
              onMultiModeChange={setMultiCategoryMode}
              singleCategory={category}
              onSingleCategoryChange={setCategory}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={setSelectedCategories}
            />
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
            <div className="grid gap-4 sm:grid-cols-2">
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
              {stadiumName && (city || country) && (
                <p className="text-sm text-muted-foreground self-end pb-2">
                  Local: {[city, country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="distanceKm">Distância (km)</Label>
                <Input
                  id="distanceKm"
                  type="number"
                  min={0}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportType">Tipo</Label>
                <Select value={transportType || "none"} onValueChange={(v) => setTransportType(v === "none" ? "" : v)}>
                  <SelectTrigger id="transportType">
                    <SelectValue placeholder="—" />
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
                <Input
                  id="estimatedDeparture"
                  type="datetime-local"
                  value={estimatedDeparture}
                  onChange={(e) => setEstimatedDeparture(e.target.value)}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedArrival">Chegada prevista</Label>
                <Input
                  id="estimatedArrival"
                  type="datetime-local"
                  value={estimatedArrival}
                  onChange={(e) => setEstimatedArrival(e.target.value)}
                  className="text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportDetails">Detalhes do transporte</Label>
              <Textarea
                id="transportDetails"
                value={transportDetails}
                onChange={(e) => setTransportDetails(e.target.value)}
                rows={3}
              />
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
              disabled={saving}
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
              disabled={saving}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hospedagem</CardTitle>
            <CardDescription>Hotel e distribuição dos quartos (tipo do cadastro + ocupantes).</CardDescription>
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
              disabled={saving}
            />
            {item.tenantId && (
              <RoomAssignmentTable
                tenantId={item.tenantId}
                value={accommodationRooms}
                onChange={setAccommodationRooms}
                disabled={saving}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nutrição e custos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nutritionApprovedBy">Aprovado por (nutrição)</Label>
                <Input
                  id="nutritionApprovedBy"
                  value={nutritionApprovedBy}
                  onChange={(e) => setNutritionApprovedBy(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCostTotal">Custo total est. (R$)</Label>
                <Input
                  id="estimatedCostTotal"
                  type="text"
                  inputMode="decimal"
                  value={estimatedCostTotal}
                  onChange={(e) => setEstimatedCostTotal(e.target.value)}
                />
              </div>
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
            </div>
            <LogisticaExpenseLinesFields
              lines={expenseLines}
              onChange={setExpenseLines}
              defaultPaymentTypeId={logisticsCadastros.paymentTypeId}
              defaultSupplierId={logisticsCadastros.supplierId}
              disabled={saving}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weatherForecast">Previsão do tempo</Label>
              <Input
                id="weatherForecast"
                value={weatherForecast}
                onChange={(e) => setWeatherForecast(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

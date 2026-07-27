"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bus,
  CalendarRange,
  Eye,
  Hotel,
  Loader2,
  Printer,
  Users,
} from "lucide-react";
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
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { isFootballKind } from "@/lib/home-data";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { formatTravelCategoriesDisplay } from "@/lib/travel-categories-utils";
import type {
  HospedesReportDto,
  PassageirosReportDto,
  PrintPageSize,
  ProgramacaoSemanalReportDto,
} from "@/lib/futebol-relatorios.types";
import {
  buildHospedesPrintHtml,
  buildPassageirosPrintHtml,
  buildProgramacaoPrintHtml,
  openReportPreview,
  printHospedesReport,
  printPassageirosReport,
  printProgramacaoReport,
} from "@/lib/futebol-relatorios-print";

interface Tenant {
  id: string;
  name: string;
  kind?: { name?: string };
  categories?: string[] | null;
}

interface TravelOption {
  id: string;
  tenantId: string;
  tenant?: { name: string };
  matchDate: string;
  opponentName?: string | null;
  championshipName?: string | null;
  category?: string | null;
  categories?: string[] | null;
  status: string;
}

function isClubForLogistica(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (!isFootballKind(kindName)) return false;
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

function formatTravelLabel(t: TravelOption): string {
  const date = new Date(t.matchDate).toLocaleDateString("pt-BR");
  const vs = t.opponentName ? ` vs ${t.opponentName}` : "";
  const cat = formatTravelCategoriesDisplay(t.category, t.categories);
  const club = t.tenant?.name ? `${t.tenant.name} · ` : "";
  return `${club}${date}${vs}${cat ? ` (${cat})` : ""}`;
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function PageSizeSelect({
  value,
  onChange,
}: {
  value: PrintPageSize;
  onChange: (v: PrintPageSize) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">Formato de impressão</Label>
      <Select value={value} onValueChange={(v) => onChange(v as PrintPageSize)}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="A4">A4</SelectItem>
          <SelectItem value="Letter">Carta (Letter)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function FutebolRelatoriosHub() {
  const { categories: allFixtureCategories } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [passTravels, setPassTravels] = useState<TravelOption[]>([]);
  const [hospTravels, setHospTravels] = useState<TravelOption[]>([]);
  const [loadingPassTravels, setLoadingPassTravels] = useState(false);
  const [loadingHospTravels, setLoadingHospTravels] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");

  const [passTenantId, setPassTenantId] = useState("");
  const [passTravelId, setPassTravelId] = useState("");

  const [hospTenantId, setHospTenantId] = useState("");
  const [hospTravelId, setHospTravelId] = useState("");

  const weekStart = useMemo(() => startOfWeekMonday(new Date()), []);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const [progTenantId, setProgTenantId] = useState("");
  const [progFrom, setProgFrom] = useState(toIsoDate(weekStart));
  const [progTo, setProgTo] = useState(toIsoDate(weekEnd));
  const [progCategories, setProgCategories] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      const clubs = list.filter((t) => isClubForLogistica(t.kind?.name));
      setTenants(clubs);
      if (clubs.length === 1) {
        setPassTenantId(clubs[0]!.id);
        setHospTenantId(clubs[0]!.id);
        setProgTenantId(clubs[0]!.id);
      }
    });
  }, []);

  const loadTravelsFor = useCallback(async (tenantId: string, target: "pass" | "hosp") => {
    if (!tenantId) {
      if (target === "pass") setPassTravels([]);
      else setHospTravels([]);
      return;
    }
    if (target === "pass") setLoadingPassTravels(true);
    else setLoadingHospTravels(true);
    try {
      const { data } = await api.get<TravelOption[]>(
        `/futebol-relatorios/viagens?tenantId=${encodeURIComponent(tenantId)}`,
      );
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
      if (target === "pass") setPassTravels(list);
      else setHospTravels(list);
    } catch {
      if (target === "pass") setPassTravels([]);
      else setHospTravels([]);
    } finally {
      if (target === "pass") setLoadingPassTravels(false);
      else setLoadingHospTravels(false);
    }
  }, []);

  useEffect(() => {
    if (passTenantId) void loadTravelsFor(passTenantId, "pass");
  }, [passTenantId, loadTravelsFor]);

  useEffect(() => {
    if (hospTenantId) void loadTravelsFor(hospTenantId, "hosp");
  }, [hospTenantId, loadTravelsFor]);

  const progTenant = tenants.find((t) => t.id === progTenantId);
  const progCategoryOptions = useMemo(() => {
    if (!progTenant) return allFixtureCategories;
    return filterCategoriesForTenant(allFixtureCategories, progTenant.categories);
  }, [allFixtureCategories, progTenant]);

  useEffect(() => {
    setProgCategories(progCategoryOptions.map((c) => c.value));
  }, [progCategoryOptions, progTenantId]);

  const showError = (message: string) => {
    setFeedback({ open: true, title: "Não foi possível gerar", message, variant: "error" });
  };

  const fetchPassageiros = async (): Promise<PassageirosReportDto | null> => {
    if (!passTravelId) {
      showError("Selecione a viagem para gerar a relação de passageiros.");
      return null;
    }
    try {
      const { data } = await api.get<PassageirosReportDto>(
        `/futebol-relatorios/passageiros?travelId=${encodeURIComponent(passTravelId)}`,
      );
      return data;
    } catch {
      showError("Erro ao carregar dados da viagem.");
      return null;
    }
  };

  const fetchHospedes = async (): Promise<HospedesReportDto | null> => {
    if (!hospTravelId) {
      showError("Selecione a viagem para gerar a relação de hóspedes.");
      return null;
    }
    try {
      const { data } = await api.get<HospedesReportDto>(
        `/futebol-relatorios/hospedes?travelId=${encodeURIComponent(hospTravelId)}`,
      );
      return data;
    } catch {
      showError("Erro ao carregar dados de hospedagem.");
      return null;
    }
  };

  const fetchProgramacao = async (): Promise<ProgramacaoSemanalReportDto | null> => {
    if (!progTenantId || !progFrom || !progTo) {
      showError("Preencha clube e período da programação semanal.");
      return null;
    }
    try {
      const params = new URLSearchParams({
        tenantId: progTenantId,
        from: progFrom,
        to: progTo,
      });
      if (progCategories.length > 0) {
        params.set("categories", progCategories.join(","));
      }
      const { data } = await api.get<ProgramacaoSemanalReportDto>(
        `/futebol-relatorios/programacao-semanal?${params.toString()}`,
      );
      return data;
    } catch {
      showError("Erro ao carregar a programação da agenda.");
      return null;
    }
  };

  const handlePreviewPassageiros = async () => {
    setBusy("pass-prev");
    const data = await fetchPassageiros();
    if (data) openReportPreview(buildPassageirosPrintHtml(data, pageSize));
    setBusy(null);
  };

  const handlePrintPassageiros = async () => {
    setBusy("pass-print");
    const data = await fetchPassageiros();
    if (data) printPassageirosReport(data, pageSize);
    setBusy(null);
  };

  const handlePreviewHospedes = async () => {
    setBusy("hosp-prev");
    const data = await fetchHospedes();
    if (data) openReportPreview(buildHospedesPrintHtml(data, pageSize));
    setBusy(null);
  };

  const handlePrintHospedes = async () => {
    setBusy("hosp-print");
    const data = await fetchHospedes();
    if (data) printHospedesReport(data, pageSize);
    setBusy(null);
  };

  const handlePreviewProgramacao = async () => {
    setBusy("prog-prev");
    const data = await fetchProgramacao();
    if (data) openReportPreview(buildProgramacaoPrintHtml(data, pageSize));
    setBusy(null);
  };

  const handlePrintProgramacao = async () => {
    setBusy("prog-print");
    const data = await fetchProgramacao();
    if (data) printProgramacaoReport(data, pageSize);
    setBusy(null);
  };

  const toggleProgCategory = (value: string) => {
    setProgCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-amber-400" />
              Relação de Passageiros
            </CardTitle>
            <CardDescription>
              Lista oficial de atletas, comissão e convidados para transporte — com CPF, RG e data de nascimento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={passTenantId || "none"}
                onValueChange={(v) => {
                  setPassTenantId(v === "none" ? "" : v);
                  setPassTravelId("");
                }}
              >
                <SelectTrigger>
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
                value={passTravelId || "none"}
                onValueChange={(v) => setPassTravelId(v === "none" ? "" : v)}
                disabled={!passTenantId || loadingPassTravels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingPassTravels ? "Carregando…" : "Selecione a viagem"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {passTravels.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {formatTravelLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() => void handlePreviewPassageiros()}
              >
                {busy === "pass-prev" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Visualizar
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
                disabled={!!busy}
                onClick={() => void handlePrintPassageiros()}
              >
                {busy === "pass-print" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Printer className="h-4 w-4 mr-1" />}
                Imprimir / PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hotel className="h-5 w-5 text-amber-400" />
              Relação de Hóspedes
            </CardTitle>
            <CardDescription>
              Quartos, tipo de apartamento e ocupantes com documentos — ideal para check-in no hotel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={hospTenantId || "none"}
                onValueChange={(v) => {
                  setHospTenantId(v === "none" ? "" : v);
                  setHospTravelId("");
                }}
              >
                <SelectTrigger>
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
                value={hospTravelId || "none"}
                onValueChange={(v) => setHospTravelId(v === "none" ? "" : v)}
                disabled={!hospTenantId || loadingHospTravels}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingHospTravels ? "Carregando…" : "Selecione a viagem"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione…</SelectItem>
                  {hospTravels.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {formatTravelLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() => void handlePreviewHospedes()}
              >
                {busy === "hosp-prev" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Visualizar
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
                disabled={!!busy}
                onClick={() => void handlePrintHospedes()}
              >
                {busy === "hosp-print" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Printer className="h-4 w-4 mr-1" />}
                Imprimir / PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarRange className="h-5 w-5 text-amber-400" />
              Programação Semanal
            </CardTitle>
            <CardDescription>
              Grade por dia e categoria com treinos, jogos e compromissos da agenda operacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={progTenantId || "none"}
                onValueChange={(v) => setProgTenantId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>De</Label>
                <Input
                  type="date"
                  className="text-foreground"
                  value={progFrom}
                  onChange={(e) => setProgFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input
                  type="date"
                  className="text-foreground"
                  value={progTo}
                  onChange={(e) => setProgTo(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categorias no relatório</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto rounded-lg border border-border p-3">
                {progCategoryOptions.map((cat) => {
                  const checked = progCategories.includes(cat.value);
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => toggleProgCategory(cat.value)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        checked
                          ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                          : "bg-muted text-muted-foreground border border-transparent hover:border-border"
                      }`}
                    >
                      {getCategoryLabel(cat.value, "pt", allFixtureCategories)}
                    </button>
                  );
                })}
              </div>
            </div>
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!!busy}
                onClick={() => void handlePreviewProgramacao()}
              >
                {busy === "prog-prev" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                Visualizar
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white"
                disabled={!!busy}
                onClick={() => void handlePrintProgramacao()}
              >
                {busy === "prog-print" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Printer className="h-4 w-4 mr-1" />}
                Imprimir / PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-4 flex items-start gap-3 text-sm text-muted-foreground">
          <Bus className="h-5 w-5 shrink-0 text-amber-500/80 mt-0.5" />
          <p>
            Os relatórios usam dados de <strong className="text-foreground">Logística</strong>,{" "}
            <strong className="text-foreground">cadastro de jogadores/comissão</strong> e{" "}
            <strong className="text-foreground">agenda operacional</strong>. Para passageiros, se houver quartos
            preenchidos na viagem, a lista prioriza quem está alocado; caso contrário, lista o elenco da categoria.
            Use <strong className="text-foreground">Imprimir / PDF</strong> e escolha &quot;Salvar como PDF&quot; no diálogo
            do navegador. Formato A4 ou Carta conforme sua impressora.
          </p>
        </CardContent>
      </Card>

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

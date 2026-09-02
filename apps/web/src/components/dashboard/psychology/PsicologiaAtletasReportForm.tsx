"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { api } from "@/lib/api";
import { reportLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import {
  PSICOLOGIA_ATLETA_FIELDS,
  buildPsicologiaAtletasPrintHtml,
  printPsicologiaAtletasReport,
  type PrintPageSize,
  type PsicologiaAtletaFieldKey,
  type PsicologiaAtletaReportData,
  type PsicologiaAtletaReportPlayer,
} from "@/lib/psicologia-atletas-print";
import {
  GroupedFieldPicker,
  PageSection,
  type GroupedFieldOption,
} from "@/components/dashboard/cup360";
import { cup360 } from "@/lib/cup360-design-tokens";

const PSYCH_FIELD_GROUPS: Record<string, string> = {
  esportivos: "Esportivos",
  cadastrais: "Cadastrais",
};

const PSYCH_FIELD_GROUP_MAP: Record<PsicologiaAtletaFieldKey, string> = {
  num: "esportivos",
  fullName: "esportivos",
  nickname: "esportivos",
  birthDate: "esportivos",
  position: "esportivos",
  category: "esportivos",
  club: "esportivos",
  jerseyNumber: "esportivos",
  cpf: "cadastrais",
  rg: "cadastrais",
  nationality: "cadastrais",
  gender: "cadastrais",
  birthPlace: "cadastrais",
  contactEmail: "cadastrais",
  contactPhone: "cadastrais",
};

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string | null;
  categories?: string[] | null;
}

interface GroupInfo {
  name: string;
  logoUrl?: string | null;
}

const DEFAULT_FIELDS = PSICOLOGIA_ATLETA_FIELDS.filter((f) => f.defaultSelected).map(
  (f) => f.key,
);

function PageSizeSelect({
  value,
  onChange,
}: {
  value: PrintPageSize;
  onChange: (v: PrintPageSize) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Tamanho da página</Label>
      <Select value={value} onValueChange={(v) => onChange(v as PrintPageSize)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="A4">A4</SelectItem>
          <SelectItem value="Letter">Letter</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function PsicologiaAtletasReportForm() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFields, setSelectedFields] = useState<PsicologiaAtletaFieldKey[]>(DEFAULT_FIELDS);
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<PsicologiaAtletaReportData | null>(null);
  const [configStep, setConfigStep] = useState<"population" | "columns">("population");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length === 1) setTenantId(list[0]!.id);
    });
    api
      .get<GroupInfo>("/group")
      .then(({ data }) => setGroup(data ?? null))
      .catch(() => setGroup(null));
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown, allCategories } = useCategoriesForTenant(
    selectedTenant?.categories,
  );

  const filtersSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(selectedTenant ? `Clube: ${selectedTenant.name}` : "Clube: todos");
    parts.push(
      category ? `Categoria: ${getCategoryLabel(category, "pt", allCategories)}` : "Categoria: todas",
    );
    parts.push(search.trim() ? `Busca: "${search.trim()}"` : "Busca: —");
    return parts.join(" · ");
  }, [selectedTenant, category, search, allCategories]);

  const fieldOptions: GroupedFieldOption[] = useMemo(
    () =>
      PSICOLOGIA_ATLETA_FIELDS.map((f) => ({
        key: f.key,
        label: f.label,
        group: PSYCH_FIELD_GROUP_MAP[f.key],
      })),
    [],
  );

  const selectAllFields = () => {
    setSelectedFields(PSICOLOGIA_ATLETA_FIELDS.map((f) => f.key));
  };

  const resetDefaultFields = () => {
    setSelectedFields(DEFAULT_FIELDS);
  };

  const fetchPlayers = async (): Promise<PsicologiaAtletaReportPlayer[]> => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (category) params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    const { data } = await api.get<PsicologiaAtletaReportPlayer[]>(`/players?${params.toString()}`);
    return Array.isArray(data) ? data : [];
  };

  const buildReportData = (players: PsicologiaAtletaReportPlayer[]): PsicologiaAtletaReportData => {
    const titleClubName = selectedTenant?.name ?? group?.name ?? "Boston City Group";
    const logoUrl = reportLogoUrlForPrint(selectedTenant?.logoUrl, !tenantId);

    return {
      titleClubName,
      logoUrl,
      filtersSummary,
      fields: selectedFields,
      players,
    };
  };

  const handlePreview = async () => {
    if (selectedFields.length === 0) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Selecione pelo menos uma coluna para o relatório.",
        variant: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const players = await fetchPlayers();
      const data = buildReportData(players);
      setReportData(data);
      setPreviewHtml(buildPsicologiaAtletasPrintHtml(data, pageSize));
      setPreviewOpen(true);
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar a lista de atletas.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = async () => {
    if (selectedFields.length === 0) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Selecione pelo menos uma coluna para o relatório.",
        variant: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const data =
        reportData ??
        buildReportData(await fetchPlayers());
      printPsicologiaAtletasReport(data, pageSize);
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível gerar o relatório para impressão.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-6 pt-6">
          {configStep === "population" ? (
            <PageSection title="População">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Clube</Label>
              <Select
                value={tenantId || "all"}
                onValueChange={(v) => {
                  setTenantId(v === "all" ? "" : v);
                  setCategory("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clubes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clubes</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={category || "all"}
                onValueChange={(v) => setCategory(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categoriesForDropdown.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.labelPT}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Busca (nome)</Label>
              <Input
                placeholder="Opcional…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <p className={cup360.type.caption}>{filtersSummary}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setConfigStep("columns")}>
              Escolher colunas
            </Button>
          </div>
            </PageSection>
          ) : (
            <>
              <PageSection
                title="Colunas"
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfigStep("population")}>
                      Voltar aos filtros
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={selectAllFields}>
                      Marcar todas
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={resetDefaultFields}>
                      Padrão psicologia
                    </Button>
                  </div>
                }
              >
                <GroupedFieldPicker
                  options={fieldOptions}
                  groupLabels={PSYCH_FIELD_GROUPS}
                  selected={selectedFields}
                  onChange={(keys) => setSelectedFields(keys as PsicologiaAtletaFieldKey[])}
                  searchPlaceholder="Buscar coluna…"
                />
              </PageSection>

              <PageSection title="Saída">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xs">
            <PageSizeSelect value={pageSize} onChange={setPageSize} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#5b21b6] text-white hover:bg-[#6d28d9]"
              disabled={busy}
              onClick={handlePreview}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Visualizar
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={handlePrint}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              Imprimir / PDF
            </Button>
          </div>
              </PageSection>
            </>
          )}
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Lista de atletas — Psicologia"
        html={previewHtml}
        onPrint={handlePrint}
      />

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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, FileSpreadsheet, Loader2, Printer } from "lucide-react";
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
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { PrintPreviewDialog } from "@/components/ui/print-preview-dialog";
import { api } from "@/lib/api";
import { exportDynamicReportExcel } from "@/lib/dynamic-reports-export";
import {
  buildDynamicReportPrintHtml,
  logoForPrint,
  printDynamicReportHtml,
  reportTitleForPreset,
  type DynamicReportResultDto,
  type PrintPageSize,
} from "@/lib/dynamic-reports-print";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";

type Tenant = { id: string; name: string; logoUrl?: string | null; categories?: string[] | null };

type FieldDef = {
  key: string;
  label: string;
  group: string;
  fieldType: string;
  populations: string[];
};

type PopulationDef = {
  key: string;
  label: string;
  source: string;
  filterKeys: string[];
};

type PresetDef = {
  id: string;
  label: string;
  population: string;
  defaultFields: string[];
  sortBy: string;
  sortDir: "asc" | "desc";
  groupBy?: string;
  lockedFields?: boolean;
};

type MetaResponse = {
  populations: PopulationDef[];
  presets: PresetDef[];
  fields: FieldDef[];
  sortOptions: Array<{ key: string; label: string; populations: string[] }>;
  groupOptions: Array<{ key: string; label: string; populations: string[] }>;
};

type Department = { id: string; name: string };

const SITUATION_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "emprestado", label: "Emprestado" },
  { value: "teste", label: "Teste" },
];

const EMPLOYEE_TYPES = [
  { value: "staff", label: "Staff" },
  { value: "athlete", label: "Atleta" },
  { value: "dirigente", label: "Dirigente" },
  { value: "temporario", label: "Temporário" },
  { value: "estagio", label: "Estágio" },
];

const GROUP_LABELS: Record<string, string> = {
  cadastrais: "Cadastrais",
  esportivos: "Esportivos",
  documentos: "Documentos",
  bancarios: "Bancários",
  emprestimo: "Empréstimo",
  rh: "RH",
  financeiro: "Financeiro",
  display: "Exibição",
};

export function DynamicReportsForm() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [presetId, setPresetId] = useState("personalizado");
  const [population, setPopulation] = useState("player.athletes");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("fullName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [category, setCategory] = useState("");
  const [situation, setSituation] = useState("");
  const [position, setPosition] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeType, setEmployeeType] = useState("");
  const [season, setSeason] = useState("");
  const [competition, setCompetition] = useState("");
  const [search, setSearch] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [pageSize, setPageSize] = useState<PrintPageSize>("A4");
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [reportData, setReportData] = useState<DynamicReportResultDto | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const selectedPreset = meta?.presets.find((p) => p.id === presetId);
  const effectivePopulation = selectedPreset?.population ?? population;
  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const { categories: categoriesForDropdown, allCategories } = useCategoriesForTenant(
    selectedTenant?.categories,
  );

  const loadMeta = useCallback(async (pop: string) => {
    const { data } = await api.get<MetaResponse>(
      `/dynamic-reports/meta?population=${encodeURIComponent(pop)}`,
    );
    setMeta(data);
  }, []);

  useEffect(() => {
    if (!effectivePopulation) return;
    loadMeta(effectivePopulation).catch(() => {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar metadados do relatório dinâmico.",
        variant: "error",
      });
    });
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list.length === 1) setTenantId(list[0]!.id);
    });
  }, [effectivePopulation, loadMeta]);

  useEffect(() => {
    if (!tenantId) {
      setDepartments([]);
      return;
    }
    api
      .get<Department[]>(`/rh/departments?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  }, [tenantId]);

  useEffect(() => {
    if (!meta) return;
    const preset = meta.presets.find((p) => p.id === presetId);
    if (!preset) return;
    setPopulation(preset.population);
    setSelectedFields([...preset.defaultFields]);
    setSortBy(preset.sortBy);
    setSortDir(preset.sortDir);
    setGroupBy(preset.groupBy ?? "none");
  }, [meta, presetId]);

  const availableFields = useMemo(() => {
    if (!meta) return [];
    return meta.fields.filter(
      (f) => f.populations.length === 0 || f.populations.includes(effectivePopulation),
    );
  }, [meta, effectivePopulation]);

  const fieldsByGroup = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    for (const f of availableFields) {
      const g = f.group || "outros";
      map.set(g, [...(map.get(g) ?? []), f]);
    }
    return map;
  }, [availableFields]);

  const sortOptions = useMemo(() => {
    if (!meta) return [];
    return meta.sortOptions.filter((o) => o.populations.includes(effectivePopulation));
  }, [meta, effectivePopulation]);

  const groupOptions = useMemo(() => {
    if (!meta) return [];
    return meta.groupOptions.filter((o) => o.populations.includes(effectivePopulation));
  }, [meta, effectivePopulation]);

  const populationDef = meta?.populations.find((p) => p.key === effectivePopulation);
  const showFilter = (key: string) => populationDef?.filterKeys.includes(key) ?? false;
  const isLockedPreset = Boolean(selectedPreset?.lockedFields);

  const toggleField = (key: string, checked: boolean) => {
    if (isLockedPreset) return;
    setSelectedFields((prev) => {
      if (checked) return prev.includes(key) ? prev : [...prev, key];
      const next = prev.filter((k) => k !== key);
      return next.length > 0 ? next : prev;
    });
  };

  const buildPayload = () => {
    const filters: Record<string, string | number | undefined> = {};
    if (category) filters.category = category;
    if (situation) filters.situation = situation;
    if (position) filters.position = position;
    if (departmentId) filters.departmentId = departmentId;
    if (employeeType) filters.employeeType = employeeType;
    if (season.trim()) filters.season = Number(season);
    if (competition.trim()) filters.competition = competition.trim();
    if (search.trim()) filters.search = search.trim();
    if (referenceDate.trim()) filters.referenceDate = referenceDate.trim();

    return {
      tenantId,
      presetId: presetId === "personalizado" ? undefined : presetId,
      population: presetId === "personalizado" ? population : undefined,
      filters,
      fields: selectedFields,
      sortBy,
      sortDir,
      groupBy: groupBy as "category" | "department" | "cafeteria" | "none",
    };
  };

  const runReport = async (): Promise<DynamicReportResultDto | null> => {
    if (!tenantId) {
      setFeedback({
        open: true,
        title: "Clube obrigatório",
        message: "Selecione o clube para gerar o relatório.",
        variant: "warning",
      });
      return null;
    }
    if (selectedFields.length === 0) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Selecione pelo menos uma coluna.",
        variant: "warning",
      });
      return null;
    }

    setBusy(true);
    try {
      const { data } = await api.post<DynamicReportResultDto>("/dynamic-reports/run", buildPayload());
      setReportData(data);
      if (data.strippedFields?.length) {
        setFeedback({
          open: true,
          title: "Campos removidos",
          message: `Alguns campos solicitados não estão autorizados para seu perfil: ${data.strippedFields.join(", ")}`,
          variant: "info",
        });
      }
      return data;
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível gerar o relatório.",
        variant: "error",
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async () => {
    const data = await runReport();
    if (!data) return;
    const title = reportTitleForPreset(presetId);
    const html = buildDynamicReportPrintHtml(
      title,
      selectedTenant?.name ?? "Clube",
      logoForPrint(selectedTenant?.logoUrl),
      data,
      pageSize,
    );
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handlePrint = async () => {
    const data = reportData ?? (await runReport());
    if (!data) return;
    const title = reportTitleForPreset(presetId);
    const html = buildDynamicReportPrintHtml(
      title,
      selectedTenant?.name ?? "Clube",
      logoForPrint(selectedTenant?.logoUrl),
      data,
      pageSize,
    );
    printDynamicReportHtml(html);
  };

  const handleExport = async () => {
    const data = reportData ?? (await runReport());
    if (!data) return;
    const slug = presetId === "lista_refeitorio" ? "lista-refeitorio" : "relatorio-dinamico";
    exportDynamicReportExcel(data, `${slug}-${tenantId.slice(0, 8)}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Relatórios dinâmicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={presetId} onValueChange={setPresetId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meta?.presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Clube</Label>
              <Select value={tenantId || "none"} onValueChange={(v) => setTenantId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
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

            {presetId === "personalizado" ? (
              <div className="space-y-2">
                <Label>População</Label>
                <NativeSelect value={population} onChange={(e) => setPopulation(e.target.value)}>
                  {meta?.populations.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showFilter("category") ? (
              <div className="space-y-2">
                <Label>Categoria</Label>
                <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Todas</option>
                  {categoriesForDropdown.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.labelPT}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}

            {showFilter("situation") ? (
              <div className="space-y-2">
                <Label>Situação</Label>
                <NativeSelect value={situation} onChange={(e) => setSituation(e.target.value)}>
                  <option value="">Todas (exc. desligados)</option>
                  {SITUATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}

            {showFilter("position") ? (
              <div className="space-y-2">
                <Label>Posição</Label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Opcional…" />
              </div>
            ) : null}

            {showFilter("departmentId") ? (
              <div className="space-y-2">
                <Label>Departamento</Label>
                <NativeSelect value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">Todos</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}

            {showFilter("employeeType") ? (
              <div className="space-y-2">
                <Label>Tipo colaborador</Label>
                <NativeSelect value={employeeType} onChange={(e) => setEmployeeType(e.target.value)}>
                  <option value="">Todos</option>
                  {EMPLOYEE_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}

            {showFilter("season") ? (
              <div className="space-y-2">
                <Label>Temporada (min. de jogo)</Label>
                <Input
                  inputMode="numeric"
                  value={season}
                  onChange={(e) => setSeason(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex.: 2026"
                />
              </div>
            ) : null}

            {showFilter("competition") ? (
              <div className="space-y-2">
                <Label>Competição (min. de jogo)</Label>
                <Input value={competition} onChange={(e) => setCompetition(e.target.value)} placeholder="Opcional…" />
              </div>
            ) : null}

            {showFilter("referenceDate") ? (
              <div className="space-y-2">
                <Label>Data de referência (salário/benefícios)</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                />
              </div>
            ) : null}

            {showFilter("search") ? (
              <div className="space-y-2">
                <Label>Busca</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome…" />
              </div>
            ) : null}
          </div>

          {!isLockedPreset ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <Label className="text-sm font-semibold">Colunas</Label>
              {[...fieldsByGroup.entries()].map(([group, fields]) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {GROUP_LABELS[group] ?? group}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((field) => {
                      const checked = selectedFields.includes(field.key);
                      const isLast = checked && selectedFields.length === 1;
                      return (
                        <label
                          key={field.key}
                          className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isLast}
                            onCheckedChange={(v) => toggleField(field.key, v === true)}
                          />
                          <span>{field.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Colunas fixas: {selectedFields.map((k) => availableFields.find((f) => f.key === k)?.label ?? k).join(", ")}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Ordenar por</Label>
              <NativeSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {sortOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Direção</Label>
              <NativeSelect value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}>
                <option value="asc">Crescente</option>
                <option value="desc">Decrescente</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Agrupamento</Label>
              <NativeSelect value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                {groupOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Página</Label>
              <NativeSelect value={pageSize} onChange={(e) => setPageSize(e.target.value as PrintPageSize)}>
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
              </NativeSelect>
            </div>
          </div>

          {effectivePopulation.startsWith("player") && category ? (
            <p className="text-xs text-muted-foreground">
              Categoria selecionada: {getCategoryLabel(category, "pt", allCategories)}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-emerald-700 text-white hover:bg-emerald-600"
              disabled={busy}
              onClick={handlePreview}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
              Visualizar
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={handlePrint}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
              Imprimir
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={handleExport}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <PrintPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={reportTitleForPreset(presetId)}
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

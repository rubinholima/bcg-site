"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { getKitchenDateRange, printKitchenMenuReport } from "@/lib/nutricao-cardapio-print";
import { printSupplementationReport } from "@/lib/nutricao-suplementacao-print";
import type {
  KitchenMenuReport,
  KitchenPrintPeriod,
  SupplementReportPeriod,
  SupplementReportScope,
  SupplementationReport,
} from "@/lib/nutricao-types";
import type { NutritionCategoryRow } from "@/app/dashboard/adm/nutricao/components/NutritionCategoryFormDialog";

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
}

interface Props {
  tenantId: string;
  categories: NutritionCategoryRow[];
  players: PlayerOption[];
}

export function NutricaoRelatoriosPanel({ tenantId, categories, players }: Props) {
  const [kitchenCategoryId, setKitchenCategoryId] = useState("");
  const [kitchenDate, setKitchenDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kitchenPeriod, setKitchenPeriod] = useState<KitchenPrintPeriod>("week");
  const [kitchenLoading, setKitchenLoading] = useState(false);

  const [suppScope, setSuppScope] = useState<SupplementReportScope>("category");
  const [suppCategoryId, setSuppCategoryId] = useState("");
  const [suppPlayerId, setSuppPlayerId] = useState("");
  const [suppPeriod, setSuppPeriod] = useState<SupplementReportPeriod>("week");
  const [suppLoading, setSuppLoading] = useState(false);

  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const tenantCategories = categories.filter((c) => c.tenant.id === tenantId);

  const handlePrintKitchen = async () => {
    if (!tenantId || !kitchenCategoryId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione clube e categoria." });
      return;
    }
    setKitchenLoading(true);
    try {
      const { startDate, endDate } = getKitchenDateRange(kitchenDate, kitchenPeriod);
      const params = new URLSearchParams({
        tenantId,
        categoryId: kitchenCategoryId,
        startDate,
        endDate,
      });
      const { data } = await api.get<KitchenMenuReport>(`/nutricao/reports/kitchen-menu?${params}`);
      printKitchenMenuReport(data, kitchenPeriod);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível gerar o cardápio.",
      });
    } finally {
      setKitchenLoading(false);
    }
  };

  const handlePrintSupplementation = async () => {
    if (!tenantId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione um clube." });
      return;
    }
    if (suppScope === "category" && !suppCategoryId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione a categoria." });
      return;
    }
    if (suppScope === "individual" && !suppPlayerId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione o atleta." });
      return;
    }
    setSuppLoading(true);
    try {
      const params = new URLSearchParams({ tenantId, scope: suppScope });
      if (suppCategoryId) params.set("categoryId", suppCategoryId);
      if (suppPlayerId) params.set("playerId", suppPlayerId);
      const { data } = await api.get<SupplementationReport>(`/nutricao/reports/supplementation?${params}`);
      printSupplementationReport(data, suppPeriod);
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível gerar o relatório.",
      });
    } finally {
      setSuppLoading(false);
    }
  };

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cardápio — cozinha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Categoria</Label>
            <NativeSelectField
              value={kitchenCategoryId}
              onChange={(e) => setKitchenCategoryId(e.target.value)}
              placeholder="Selecione…"
              options={tenantCategories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Data de referência</Label>
            <Input
              type="date"
              className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
              value={kitchenDate}
              onChange={(e) => setKitchenDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Período</Label>
            <Select value={kitchenPeriod} onValueChange={(v) => setKitchenPeriod(v as KitchenPrintPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dia</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePrintKitchen} disabled={kitchenLoading}>
            {kitchenLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
            Imprimir cardápio
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Suplementação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Escopo</Label>
            <Select value={suppScope} onValueChange={(v) => setSuppScope(v as SupplementReportScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team">Time todo</SelectItem>
                <SelectItem value="category">Por categoria</SelectItem>
                <SelectItem value="individual">Individual (atleta)</SelectItem>
                <SelectItem value="all">Todos cadastrados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(suppScope === "category" || suppScope === "all") && (
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <NativeSelectField
                value={suppCategoryId}
                onChange={(e) => setSuppCategoryId(e.target.value)}
                placeholder="Opcional…"
                options={tenantCategories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          )}
          {suppScope === "individual" && (
            <div className="grid gap-2">
              <Label>Atleta</Label>
              <NativeSelectField
                value={suppPlayerId}
                onChange={(e) => setSuppPlayerId(e.target.value)}
                placeholder="Selecione…"
                options={players.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}`,
                }))}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>Relatório</Label>
            <Select value={suppPeriod} onValueChange={(v) => setSuppPeriod(v as SupplementReportPeriod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Semanal</SelectItem>
                <SelectItem value="month">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handlePrintSupplementation} disabled={suppLoading}>
            {suppLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
            Imprimir suplementação
          </Button>
        </CardContent>
      </Card>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}

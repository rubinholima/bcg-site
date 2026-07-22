"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { cadastroEmail } from "@/lib/cadastro-format";
import { PurchaseSettingsRow, PurchaseSettingsSummaryRow } from "@/lib/purchase-workflow-types";
import { Tenant } from "@/types/tenant";

interface PurchaseWorkflowSettingsFormProps {
  tenants: Tenant[];
  readOnly?: boolean;
  defaultTenantId?: string;
  /** Visão geral de todas as empresas — apenas super admin */
  showAllResponsibles?: boolean;
}

const EMPTY_NOTIFY = {
  comprasNotifyEmail: "",
  comprasNotifyPhone: "",
  financeiroNotifyEmail: "",
  financeiroNotifyPhone: "",
  tiNotifyEmail: "",
  tiNotifyPhone: "",
  diretoriaNotifyEmail: "",
  diretoriaNotifyPhone: "",
};

function contactCell(email?: string | null, phone?: string | null) {
  const mail = cadastroEmail(email);
  if (!mail && !phone?.trim()) return "—";
  return [mail || undefined, phone?.trim()].filter(Boolean).join(" · ");
}

export function PurchaseWorkflowSettingsForm({
  tenants,
  readOnly = false,
  defaultTenantId,
  showAllResponsibles = false,
}: PurchaseWorkflowSettingsFormProps) {
  const [settingsTenantId, setSettingsTenantId] = useState(defaultTenantId ?? "");
  const [allSummary, setAllSummary] = useState<PurchaseSettingsSummaryRow[]>([]);
  const [loadingAllSummary, setLoadingAllSummary] = useState(false);
  const [threshold, setThreshold] = useState("5000");
  const [minQuotes, setMinQuotes] = useState("2");
  const [maxQuotes, setMaxQuotes] = useState("4");
  const [notify, setNotify] = useState(EMPTY_NOTIFY);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const selectedTenantName =
    tenants.find((t) => t.id === settingsTenantId)?.name ??
    allSummary.find((r) => r.tenantId === settingsTenantId)?.tenantName ??
    "";

  const loadAllSummary = useCallback(() => {
    if (!showAllResponsibles) return;
    setLoadingAllSummary(true);
    api
      .get<PurchaseSettingsSummaryRow[]>("/compras/workflow/settings/all")
      .then(({ data }) => setAllSummary(Array.isArray(data) ? data : []))
      .catch(() => setAllSummary([]))
      .finally(() => setLoadingAllSummary(false));
  }, [showAllResponsibles]);

  useEffect(() => {
    loadAllSummary();
  }, [loadAllSummary]);

  useEffect(() => {
    if (defaultTenantId && !settingsTenantId) {
      setSettingsTenantId(defaultTenantId);
    }
  }, [defaultTenantId, settingsTenantId]);

  useEffect(() => {
    if (!settingsTenantId) return;
    setLoadingSettings(true);
    api
      .get<PurchaseSettingsRow>(`/compras/workflow/settings?tenantId=${encodeURIComponent(settingsTenantId)}`)
      .then(({ data }) => {
        setThreshold(String(data.approvalThresholdBrl ?? 5000));
        setMinQuotes(String(data.minQuotes ?? 2));
        setMaxQuotes(String(data.maxQuotes ?? 4));
        setNotify({
          comprasNotifyEmail: cadastroEmail(data.comprasNotifyEmail),
          comprasNotifyPhone: data.comprasNotifyPhone ?? "",
          financeiroNotifyEmail: cadastroEmail(data.financeiroNotifyEmail),
          financeiroNotifyPhone: data.financeiroNotifyPhone ?? "",
          tiNotifyEmail: cadastroEmail(data.tiNotifyEmail),
          tiNotifyPhone: data.tiNotifyPhone ?? "",
          diretoriaNotifyEmail: cadastroEmail(data.diretoriaNotifyEmail),
          diretoriaNotifyPhone: data.diretoriaNotifyPhone ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoadingSettings(false));
  }, [settingsTenantId]);

  const saveSettings = async () => {
    if (!settingsTenantId || readOnly) return;
    setSavingSettings(true);
    try {
      await api.patch(`/compras/workflow/settings?tenantId=${encodeURIComponent(settingsTenantId)}`, {
        approvalThresholdBrl: parseFloat(threshold) || 5000,
        minQuotes: parseInt(minQuotes, 10) || 2,
        maxQuotes: parseInt(maxQuotes, 10) || 4,
        comprasNotifyEmail: cadastroEmail(notify.comprasNotifyEmail) || null,
        comprasNotifyPhone: notify.comprasNotifyPhone.trim() || null,
        financeiroNotifyEmail: cadastroEmail(notify.financeiroNotifyEmail) || null,
        financeiroNotifyPhone: notify.financeiroNotifyPhone.trim() || null,
        tiNotifyEmail: cadastroEmail(notify.tiNotifyEmail) || null,
        tiNotifyPhone: notify.tiNotifyPhone.trim() || null,
        diretoriaNotifyEmail: cadastroEmail(notify.diretoriaNotifyEmail) || null,
        diretoriaNotifyPhone: notify.diretoriaNotifyPhone.trim() || null,
      });
      loadAllSummary();
      alert("Configurações salvas.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSavingSettings(false);
    }
  };

  const notifyRow = (
    dept: string,
    emailKey: keyof typeof EMPTY_NOTIFY,
    phoneKey: keyof typeof EMPTY_NOTIFY,
  ) => (
    <div className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr] sm:items-end">
      <Label className="font-medium text-foreground sm:pb-2">{dept}</Label>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">E-mail</Label>
        <Input
          type="email"
          placeholder="email@empresa.com"
          value={notify[emailKey]}
          onChange={(e) => setNotify((n) => ({ ...n, [emailKey]: e.target.value }))}
          className="text-foreground"
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs text-muted-foreground">Telefone</Label>
        <Input
          type="tel"
          placeholder="(11) 99999-9999"
          value={notify[phoneKey]}
          onChange={(e) => setNotify((n) => ({ ...n, [phoneKey]: e.target.value }))}
          className="text-foreground"
          disabled={readOnly}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Clube / empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md grid gap-2">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={settingsTenantId}
              onChange={(e) => setSettingsTenantId(e.target.value)}
              disabled={readOnly && !settingsTenantId}
            >
              <option value="">Selecione</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {!settingsTenantId ? null : loadingSettings ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Regras de aprovação
                {selectedTenantName ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">— {selectedTenantName}</span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Limite diretoria (R$)</Label>
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-36 text-foreground"
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Mín. cotações</Label>
                  <Input
                    type="number"
                    min={2}
                    max={4}
                    value={minQuotes}
                    onChange={(e) => setMinQuotes(e.target.value)}
                    className="w-24 text-foreground"
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Máx. cotações</Label>
                  <Input
                    type="number"
                    min={2}
                    max={4}
                    value={maxQuotes}
                    onChange={(e) => setMaxQuotes(e.target.value)}
                    className="w-24 text-foreground"
                    disabled={readOnly}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Alertas — responsáveis
                {selectedTenantName ? (
                  <span className="text-sm font-normal text-muted-foreground">— {selectedTenantName}</span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {notifyRow("Compras", "comprasNotifyEmail", "comprasNotifyPhone")}
              {notifyRow("Financeiro", "financeiroNotifyEmail", "financeiroNotifyPhone")}
              {notifyRow("TI", "tiNotifyEmail", "tiNotifyPhone")}
              {notifyRow("Diretoria", "diretoriaNotifyEmail", "diretoriaNotifyPhone")}
            </CardContent>
          </Card>

          {!readOnly && (
            <Button type="button" disabled={savingSettings} onClick={saveSettings}>
              {savingSettings ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          )}
        </>
      )}

      {showAllResponsibles ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Responsáveis cadastrados — todas as empresas
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingAllSummary ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </p>
            ) : allSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa / clube</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Financeiro</TableHead>
                    <TableHead>TI</TableHead>
                    <TableHead>Diretoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSummary.map((row) => (
                    <TableRow
                      key={row.tenantId}
                      className="cursor-pointer hover:bg-accent/30"
                      onClick={() => setSettingsTenantId(row.tenantId)}
                    >
                      <TableCell className="font-medium whitespace-nowrap">{row.tenantName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[10rem] truncate">
                        {contactCell(row.comprasNotifyEmail, row.comprasNotifyPhone)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[10rem] truncate">
                        {contactCell(row.financeiroNotifyEmail, row.financeiroNotifyPhone)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[10rem] truncate">
                        {contactCell(row.tiNotifyEmail, row.tiNotifyPhone)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[10rem] truncate">
                        {contactCell(row.diretoriaNotifyEmail, row.diretoriaNotifyPhone)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

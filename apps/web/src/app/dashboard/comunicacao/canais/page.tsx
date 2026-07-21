"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  DashboardDeptSection,
  DashboardDialogBody,
  DashboardDialogFooter,
  DashboardEmptyState,
  DashboardFormSection,
  DashboardLoadingState,
} from "@/components/dashboard/DashboardDeptHeader";
import { COMMUNICATION_DEPARTMENTS } from "@/components/dashboard/comunicacao/constants";
import { NativeSelect } from "@/components/ui/native-select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import {
  CHANNEL_LABELS,
  type CommunicationChannelAccount,
} from "@/components/dashboard/comunicacao/types";

const EMPTY_FORM = {
  tenantId: "",
  channelType: "whatsapp",
  department: "",
  departmentCustom: "",
  externalId: "",
  displayAddress: "",
};

export default function ComunicacaoCanaisPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [rows, setRows] = useState<CommunicationChannelAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === tenantId)?.name,
    [tenants, tenantId],
  );

  const formTenantName = useMemo(
    () => tenants.find((t) => t.id === (form.tenantId || tenantId))?.name,
    [tenants, form.tenantId, tenantId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<CommunicationChannelAccount[]>(`/comunicacao/channels${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("comunicacao")) {
      router.replace("/403");
      return;
    }
    api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (!canAccessModule("comunicacao") || authLoading) return;
    void load();
  }, [load, canAccessModule, authLoading]);

  const openNewChannel = () => {
    setForm({
      ...EMPTY_FORM,
      tenantId: tenantId || "",
    });
    setOpen(true);
  };

  const resolveDepartmentLabel = (): string => {
    if (form.department === "outro") return form.departmentCustom.trim();
    const preset = COMMUNICATION_DEPARTMENTS.find((d) => d.value === form.department);
    return preset?.label ?? form.department.trim();
  };

  const handleSave = async () => {
    const effectiveTenantId = tenantId || form.tenantId;
    const departmentLabel = resolveDepartmentLabel();
    if (!effectiveTenantId) {
      setFeedback({ type: "err", msg: "Selecione a empresa/clube no filtro da página ou no formulário." });
      return;
    }
    if (!departmentLabel) {
      setFeedback({ type: "err", msg: "Informe o departamento / área do canal." });
      return;
    }
    if (!form.externalId.trim()) {
      setFeedback({ type: "err", msg: "Informe o phone_number_id do Meta (ID externo)." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/comunicacao/channels", {
        tenantId: effectiveTenantId,
        channelType: form.channelType,
        label: departmentLabel,
        externalId: form.externalId.trim(),
        displayAddress: form.displayAddress.trim() || undefined,
      });
      setOpen(false);
      setFeedback({ type: "ok", msg: "Canal salvo." });
      await load();
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível salvar o canal." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !canAccessModule("comunicacao")) return null;

  return (
    <>
      <DashboardDeptSection
        title="Contas de canal"
        description="Um registro por departamento e número WhatsApp. A empresa vem do filtro acima."
        aside={
          <Button type="button" className="min-h-[44px]" onClick={openNewChannel}>
            <Plus className="mr-2 h-4 w-4" />
            Novo canal
          </Button>
        }
      >
        <div className="mb-3 max-w-sm">
          <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Empresa / clube
          </Label>
          <Select
            value={tenantId || "__all__"}
            onValueChange={(v) => setTenantId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Todas as unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <DashboardLoadingState />
        ) : rows.length === 0 ? (
          <DashboardEmptyState>
            Nenhum canal cadastrado. Escolha a empresa e adicione o departamento com o phone_number_id.
          </DashboardEmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>phone_number_id</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">
                      {tenants.find((t) => t.id === row.tenantId)?.name ?? row.tenantId}
                    </TableCell>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{CHANNEL_LABELS[row.channelType] ?? row.channelType}</TableCell>
                    <TableCell className="font-mono text-xs">{row.externalId || "—"}</TableCell>
                    <TableCell>{row.displayAddress || "—"}</TableCell>
                    <TableCell>{row.isActive ? "Sim" : "Não"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardDeptSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo canal</DialogTitle>
          </DialogHeader>
          <DashboardDialogBody>
            <DashboardFormSection title="WhatsApp / departamento">
              <div className="grid gap-3">
                {tenantId ? (
                  <div className="space-y-1.5">
                    <Label>Empresa / clube</Label>
                    <p className="min-h-[44px] rounded-md border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground">
                      {selectedTenantName ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Definida no filtro da página. Para trocar, feche o modal e altere o filtro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Empresa / clube</Label>
                    <NativeSelect
                      value={form.tenantId}
                      onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
                    >
                      <option value="">Selecione…</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Departamento / área</Label>
                  <NativeSelect
                    value={form.department}
                    onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  >
                    <option value="">Selecione o departamento…</option>
                    {COMMUNICATION_DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {form.department === "outro" && (
                  <div className="space-y-1.5">
                    <Label>Nome do departamento</Label>
                    <Input
                      className="min-h-[44px] text-foreground"
                      value={form.departmentCustom}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, departmentCustom: e.target.value }))
                      }
                      placeholder="Ex.: Parcerias internacionais"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Tipo de canal</Label>
                  <NativeSelect
                    value={form.channelType}
                    onChange={(e) => setForm((f) => ({ ...f, channelType: e.target.value }))}
                  >
                    {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label>phone_number_id (Meta)</Label>
                  <Input
                    className="min-h-[44px] font-mono text-foreground"
                    value={form.externalId}
                    onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
                    placeholder="Ex.: 123456789012345"
                  />
                  <p className="text-xs text-muted-foreground">
                    Meta Business → WhatsApp → Configuração da API → ID do número de telefone.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Número exibido</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    value={form.displayAddress}
                    onChange={(e) => setForm((f) => ({ ...f, displayAddress: e.target.value }))}
                    placeholder="+1 617…"
                  />
                </div>

                {(tenantId || form.tenantId) && formTenantName && form.department && (
                  <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                    Resumo: <strong className="text-foreground">{formTenantName}</strong>
                    {" · "}
                    <strong className="text-foreground">{resolveDepartmentLabel() || "…"}</strong>
                    {" · "}
                    {CHANNEL_LABELS[form.channelType] ?? form.channelType}
                  </p>
                )}
              </div>
            </DashboardFormSection>
          </DashboardDialogBody>
          <DashboardDialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DashboardDialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => {
          if (!o) setFeedback(null);
        }}
        variant={feedback?.type === "ok" ? "success" : "error"}
        title={feedback?.type === "ok" ? "Pronto" : "Erro"}
        message={feedback?.msg ?? ""}
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import {
  CHANNEL_LABELS,
  type CommunicationChannelAccount,
} from "@/components/dashboard/comunicacao/types";

export default function ComunicacaoCanaisPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [rows, setRows] = useState<CommunicationChannelAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tenantId: "",
    channelType: "whatsapp",
    label: "",
    externalId: "",
    displayAddress: "",
  });
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

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

  const handleSave = async () => {
    if (!form.tenantId || !form.label.trim()) {
      setFeedback({ type: "err", msg: "Unidade e rótulo são obrigatórios." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/comunicacao/channels", {
        tenantId: form.tenantId,
        channelType: form.channelType,
        label: form.label.trim(),
        externalId: form.externalId.trim() || undefined,
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
        description="Cadastre o phone_number_id do WhatsApp Cloud API por unidade. Credenciais cifradas entram na próxima fase."
        aside={
          <Button type="button" className="min-h-[44px]" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo canal
          </Button>
        }
      >
        <div className="mb-3 max-w-sm">
          <Select
            value={tenantId || "__all__"}
            onValueChange={(v) => setTenantId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Filtrar unidade" />
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
            Nenhum canal cadastrado. Adicione a conta WhatsApp da unidade.
          </DashboardEmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Rótulo</TableHead>
                  <TableHead>ID externo</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">
                      {tenants.find((t) => t.id === row.tenantId)?.name ?? row.tenantId}
                    </TableCell>
                    <TableCell>{CHANNEL_LABELS[row.channelType] ?? row.channelType}</TableCell>
                    <TableCell>{row.label}</TableCell>
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
            <DashboardFormSection title="WhatsApp / canal">
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label>Unidade</Label>
                  <Select
                    value={form.tenantId || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, tenantId: v }))}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Empresa / clube" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.channelType}
                    onValueChange={(v) => setForm((f) => ({ ...f, channelType: v }))}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Rótulo</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    value={form.label}
                    onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                    placeholder="Ex.: Boston City FC USA — WhatsApp"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ID externo (phone_number_id)</Label>
                  <Input
                    className="min-h-[44px] font-mono text-foreground"
                    value={form.externalId}
                    onChange={(e) => setForm((f) => ({ ...f, externalId: e.target.value }))}
                  />
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

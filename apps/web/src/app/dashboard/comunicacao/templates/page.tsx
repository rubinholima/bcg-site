"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  type CommunicationTemplate,
} from "@/components/dashboard/comunicacao/types";

export default function ComunicacaoTemplatesPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [rows, setRows] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tenantId: "",
    channelType: "whatsapp",
    name: "",
    body: "",
    externalName: "",
  });
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<CommunicationTemplate[]>(
        `/comunicacao/templates?tenantId=${encodeURIComponent(tenantId)}`,
      );
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
    api.get<Tenant[]>("/tenants").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      if (list[0] && !tenantId) setTenantId(list[0].id);
    });
  }, [authLoading, canAccessModule, router, tenantId]);

  useEffect(() => {
    if (!canAccessModule("comunicacao") || authLoading) return;
    void load();
  }, [load, canAccessModule, authLoading]);

  const handleSave = async () => {
    if (!form.tenantId || !form.name.trim() || !form.body.trim()) {
      setFeedback({ type: "err", msg: "Preencha unidade, nome e corpo." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/comunicacao/templates", {
        ...form,
        name: form.name.trim(),
        body: form.body.trim(),
        externalName: form.externalName.trim() || undefined,
      });
      setOpen(false);
      setFeedback({ type: "ok", msg: "Template criado." });
      if (form.tenantId === tenantId) await load();
      else setTenantId(form.tenantId);
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível criar o template." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !canAccessModule("comunicacao")) return null;

  return (
    <>
      <DashboardDeptSection
        title="Templates"
        description="Respostas sugeridas e templates Meta (nome externo) por unidade."
        aside={
          <Button
            type="button"
            className="min-h-[44px]"
            onClick={() => {
              setForm((f) => ({ ...f, tenantId: tenantId || f.tenantId }));
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo template
          </Button>
        }
      >
        <div className="mb-3 max-w-sm">
          <Select value={tenantId || undefined} onValueChange={setTenantId}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Unidade" />
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

        {loading ? (
          <DashboardLoadingState />
        ) : !tenantId ? (
          <DashboardEmptyState>Selecione uma unidade.</DashboardEmptyState>
        ) : rows.length === 0 ? (
          <DashboardEmptyState>Nenhum template nesta unidade.</DashboardEmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Corpo</TableHead>
                  <TableHead>Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{CHANNEL_LABELS[row.channelType] ?? row.channelType}</TableCell>
                    <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                      {row.body}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.externalName || "—"}</TableCell>
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
            <DialogTitle>Novo template</DialogTitle>
          </DialogHeader>
          <DashboardDialogBody>
            <DashboardFormSection title="Conteúdo">
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
                  <Label>Canal</Label>
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
                  <Label>Nome</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Corpo</Label>
                  <Textarea
                    className="min-h-[100px] text-foreground"
                    value={form.body}
                    onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nome no Meta (opcional)</Label>
                  <Input
                    className="min-h-[44px] font-mono text-foreground"
                    value={form.externalName}
                    onChange={(e) => setForm((f) => ({ ...f, externalName: e.target.value }))}
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

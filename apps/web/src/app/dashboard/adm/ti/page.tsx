"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Monitor, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import {
  TI_PRIORITY_LABELS,
  TI_TICKET_STATUS_LABELS,
  TiSupportTicketRow,
} from "@/lib/purchase-workflow-types";
import { PurchaseRequisitionWorkflowPanel } from "@/app/dashboard/adm/compras/components/PurchaseRequisitionWorkflowPanel";
import { WorkflowInboxBanner } from "@/components/settings/WorkflowInboxBanner";

export default function TiAtendimentoPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tickets, setTickets] = useState<TiSupportTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [tenantId, setTenantId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTickets = () => {
    setLoading(true);
    api
      .get<TiSupportTicketRow[]>("/ti/tickets")
      .then(({ data }) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!canAccessModule("adm_ti") && !authLoading) return;
    api.get<Tenant[]>("/tenants").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      setTenantId(list[0]?.id ?? "");
    });
    loadTickets();
  }, [canAccessModule, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessModule("adm_ti")) {
    router.replace("/403");
    return null;
  }

  const createTicket = async () => {
    if (!tenantId || !subject.trim()) return;
    setSaving(true);
    try {
      await api.post("/ti/tickets", { tenantId, subject, description, priority });
      setTicketOpen(false);
      setSubject("");
      setDescription("");
      loadTickets();
      alert(
        "Chamado registrado. A equipe de TI foi notificada por e-mail (se configurado em Configurações → Requisições).",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const updateTicketStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/ti/tickets/${id}`, { status });
      loadTickets();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/adm">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Monitor className="h-8 w-8" />
            TI — Atendimento
          </h1>
          <p className="text-muted-foreground">
            Chamados de suporte e requisições de equipamento (fluxo de compras).
          </p>
        </div>
      </div>

      <WorkflowInboxBanner variant="ti" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Chamados</CardTitle>
          <Button type="button" size="sm" onClick={() => setTicketOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo chamado
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum chamado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell>{t.requestedByName}</TableCell>
                    <TableCell>{TI_PRIORITY_LABELS[t.priority] ?? t.priority}</TableCell>
                    <TableCell>{TI_TICKET_STATUS_LABELS[t.status] ?? t.status}</TableCell>
                    <TableCell>
                      {t.status === "aberto" && (
                        <Button type="button" size="sm" variant="outline" onClick={() => updateTicketStatus(t.id, "em_atendimento")}>
                          Atender
                        </Button>
                      )}
                      {t.status === "em_atendimento" && (
                        <Button type="button" size="sm" variant="outline" onClick={() => updateTicketStatus(t.id, "resolvido")}>
                          Resolver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PurchaseRequisitionWorkflowPanel mode="compras" tenants={tenants} requestType="ti" defaultTenantId={tenants[0]?.id} />

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo chamado TI</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Clube</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Assunto *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="uppercase" />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <textarea className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Prioridade</Label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTicketOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={saving} onClick={createTicket}>Abrir chamado</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

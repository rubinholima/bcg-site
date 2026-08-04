"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Monitor, Plus } from "lucide-react";
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

export default function RequisicaoTiPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tickets, setTickets] = useState<TiSupportTicketRow[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [tenantId, setTenantId] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTickets = () => {
    setLoadingTickets(true);
    api
      .get<TiSupportTicketRow[]>("/ti/public/tickets/mine")
      .then(({ data }) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setLoadingTickets(false));
  };

  useEffect(() => {
    if (!canAccessModule("requisicoes") && !authLoading) return;
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

  if (!canAccessModule("requisicoes")) {
    router.replace("/403");
    return null;
  }

  const createTicket = async () => {
    if (!tenantId || !subject.trim()) return;
    setSaving(true);
    try {
      await api.post("/ti/public/tickets", { tenantId, subject, description, priority });
      setTicketOpen(false);
      setSubject("");
      setDescription("");
      loadTickets();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">Chamados de suporte</CardTitle>
          <Button type="button" size="sm" onClick={() => setTicketOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo chamado
          </Button>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum chamado aberto.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aberto em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.subject}</TableCell>
                      <TableCell>{TI_PRIORITY_LABELS[t.priority] ?? t.priority}</TableCell>
                      <TableCell>{TI_TICKET_STATUS_LABELS[t.status] ?? t.status}</TableCell>
                      <TableCell>{formatDateDayMonYear(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Novo chamado de suporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Clube / Empresa *</Label>
              <select
                className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              >
                <option value="">Selecione</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Assunto *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Prioridade</Label>
              <select
                className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTicketOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving || !tenantId || !subject.trim()} onClick={createTicket}>
              Abrir chamado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

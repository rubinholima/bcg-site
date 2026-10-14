"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type StaffRow = {
  id: string;
  roleLabel: string;
  contractorName: string | null;
  locationLabel: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  status: string;
  employee?: { name: string } | null;
  supplier?: { name: string } | null;
};

type ServiceRow = {
  id: string;
  description: string;
  operationalStatus: string;
  contractedAmount: string | null;
  plannedCost: string | null;
  supplier?: { name: string } | null;
};

export function BostonCityHallEventStaffAndServices({ eventId }: { eventId: string }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLabel, setRoleLabel] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.get<StaffRow[]>(`/boston-city-hall/events/${encodeURIComponent(eventId)}/staff-assignments`),
        api.get<ServiceRow[]>(`/boston-city-hall/events/${encodeURIComponent(eventId)}/service-commitments`),
      ]);
      setStaff(Array.isArray(sRes.data) ? sRes.data : []);
      setServices(Array.isArray(cRes.data) ? cRes.data : []);
    } catch {
      setFeedback({
        title: "Erro ao carregar",
        message: "Não foi possível carregar equipe e serviços deste evento.",
      });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addStaff = async () => {
    if (!roleLabel.trim()) return;
    try {
      await api.post(`/boston-city-hall/events/${encodeURIComponent(eventId)}/staff-assignments`, {
        roleLabel: roleLabel.trim(),
        contractorName: contractorName.trim() || null,
      });
      setRoleLabel("");
      setContractorName("");
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível adicionar o turno." });
    }
  };

  const addService = async () => {
    if (!serviceDesc.trim()) return;
    try {
      await api.post(`/boston-city-hall/events/${encodeURIComponent(eventId)}/service-commitments`, {
        description: serviceDesc.trim(),
      });
      setServiceDesc("");
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível registrar o serviço." });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-200">Equipe e turnos</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-40 space-y-1">
              <Label className="text-xs">Função</Label>
              <Input
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                className="h-9 text-foreground"
                placeholder="Ex.: Portaria"
              />
            </div>
            <div className="w-44 space-y-1">
              <Label className="text-xs">Pessoa / contratado</Label>
              <Input
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="h-9 text-foreground"
                placeholder="Nome"
              />
            </div>
            <Button type="button" size="sm" className="min-h-[36px]" onClick={() => void addStaff()}>
              <Plus className="mr-1 h-4 w-4" />
              Adicionar turno
            </Button>
          </div>
        </div>
        {staff.length === 0 ? (
          <BchEmptyState message="Nenhum turno cadastrado. Registre funções e responsáveis deste evento." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.roleLabel}</TableCell>
                  <TableCell>
                    {row.employee?.name ?? row.contractorName ?? row.supplier?.name ?? "—"}
                  </TableCell>
                  <TableCell>{row.locationLabel ?? "—"}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-medium text-slate-200">Serviços e fornecedores</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-64 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={serviceDesc}
                onChange={(e) => setServiceDesc(e.target.value)}
                className="h-9 text-foreground"
                placeholder="Ex.: Som / iluminação"
              />
            </div>
            <Button type="button" size="sm" variant="outline" className="min-h-[36px]" onClick={() => void addService()}>
              <Plus className="mr-1 h-4 w-4" />
              Vincular serviço
            </Button>
          </div>
        </div>
        {services.length === 0 ? (
          <BchEmptyState message="Nenhum serviço vinculado. Registre fornecedores e entregas contratadas." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.supplier?.name ?? "—"}</TableCell>
                  <TableCell>{row.operationalStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant="error"
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}

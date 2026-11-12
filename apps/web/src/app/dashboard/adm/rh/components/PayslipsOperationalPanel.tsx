"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { DashboardDeptTabs } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { PAYSLIP_STATUS_LABELS } from "@/lib/rh-labels";

type Tab = "lotes" | "pendentes" | "individuais" | "ciencias";

type Batch = {
  id: string;
  referenceMonth: string;
  bulkFileName: string;
  status: string;
  pageCount?: number | null;
  _count?: { individuals: number; pageAssignments: number };
};

type Individual = {
  id: string;
  referenceMonth: string;
  status: string;
  employee?: { id?: string; name?: string };
  batch?: { id?: string; referenceMonth?: string };
};

type Props = { tenantId: string; initialSubTab?: Tab };

export function PayslipsOperationalPanel({ tenantId, initialSubTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialSubTab ?? "lotes");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceMonth, setReferenceMonth] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const loadBatches = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await api.get<Batch[]>(`/rh/payslips/batches?tenantId=${encodeURIComponent(tenantId)}`);
    setBatches(Array.isArray(data) ? data : []);
  }, [tenantId]);

  const loadIndividuals = useCallback(
    async (status?: string) => {
      if (!tenantId) return;
      const params = new URLSearchParams({ tenantId });
      if (status) params.set("status", status);
      const { data } = await api.get<Individual[]>(`/rh/payslips/individuals?${params.toString()}`);
      setIndividuals(Array.isArray(data) ? data : []);
    },
    [tenantId],
  );

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (tab === "lotes" || tab === "pendentes") await loadBatches();
      if (tab === "individuais") await loadIndividuals();
      if (tab === "ciencias") await loadIndividuals("CIENCIA_PENDENTE");
    } catch {
      setBatches([]);
      setIndividuals([]);
    } finally {
      setLoading(false);
    }
  }, [tab, tenantId, loadBatches, loadIndividuals]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !referenceMonth.trim() || !tenantId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione competência e PDF." });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tenantId", tenantId);
    fd.append("referenceMonth", referenceMonth);
    try {
      await api.post("/rh/payslips/batches/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFeedback({ open: true, title: "Sucesso", message: "Lote enviado." });
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Falha no upload." });
    }
  };

  const transition = async (id: string, toStatus: string) => {
    try {
      await api.post(`/rh/payslips/individuals/${id}/transition`, { toStatus });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Transição não permitida." });
    }
  };

  const acknowledge = async (id: string) => {
    try {
      await api.post(`/rh/payslips/individuals/${id}/acknowledge`);
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar a ciência." });
    }
  };

  if (!tenantId) {
    return <p className="text-muted-foreground text-sm py-6">Selecione um clube/empresa no filtro.</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingBatches = batches.filter((b) => b.status === "PENDENTE_DE_SEPARACAO" || b.status === "SEPARADO");

  return (
    <div className="space-y-4">
      <DashboardDeptTabs
        tabs={[
          { id: "lotes", label: "Lotes" },
          { id: "pendentes", label: "Pendentes" },
          { id: "individuais", label: "Individuais" },
          { id: "ciencias", label: "Ciências" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "lotes" && (
        <>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-2">
            <Input type="date" className="text-foreground min-h-[44px]" value={referenceMonth} onChange={(e) => setReferenceMonth(e.target.value)} />
            <Input ref={fileRef} type="file" accept="application/pdf" className="text-foreground min-h-[44px]" />
            <Button type="button" className="min-h-[44px]" onClick={upload}>
              <Upload className="h-4 w-4 mr-2" />
              Novo lote
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Atribuições</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{formatDateDayMonYear(b.referenceMonth)}</TableCell>
                  <TableCell>{b.bulkFileName}</TableCell>
                  <TableCell>{PAYSLIP_STATUS_LABELS[b.status] ?? b.status}</TableCell>
                  <TableCell>{b._count?.pageAssignments ?? 0}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
                      <Link href={`/dashboard/adm/rh/contracheques/${b.id}`}>Abrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {tab === "pendentes" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingBatches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{formatDateDayMonYear(b.referenceMonth)}</TableCell>
                <TableCell>{PAYSLIP_STATUS_LABELS[b.status] ?? b.status}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
                    <Link href={`/dashboard/adm/rh/contracheques/${b.id}`}>Separar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {(tab === "individuais" || tab === "ciencias") && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[12rem]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {individuals.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.employee?.name ?? "—"}</TableCell>
                <TableCell>{formatDateDayMonYear(row.referenceMonth)}</TableCell>
                <TableCell>{PAYSLIP_STATUS_LABELS[row.status] ?? row.status}</TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {row.status === "EM_CONFERENCIA" && (
                    <Button size="sm" className="min-h-[44px]" type="button" onClick={() => transition(row.id, "APROVADO")}>
                      Aprovar
                    </Button>
                  )}
                  {row.status === "APROVADO" && (
                    <Button size="sm" className="min-h-[44px]" type="button" onClick={() => transition(row.id, "DISPONIBILIZADO")}>
                      Disponibilizar
                    </Button>
                  )}
                  {tab === "ciencias" && (
                    <Button size="sm" variant="outline" className="min-h-[44px]" type="button" onClick={() => acknowledge(row.id)}>
                      Registrar ciência
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <FeedbackModal open={feedback.open} onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))} title={feedback.title} message={feedback.message} />
    </div>
  );
}

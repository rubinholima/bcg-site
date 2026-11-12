"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { PAYSLIP_STATUS_LABELS } from "@/lib/rh-labels";

type BatchDetail = {
  id: string;
  tenantId: string;
  referenceMonth: string;
  bulkFileName: string;
  status: string;
  pageCount?: number | null;
  pageAssignments: Array<{
    id: string;
    employeeId: string;
    employmentId?: string | null;
    pageFrom: number;
    pageTo: number;
    employee?: { name?: string };
  }>;
  individuals: Array<{ id: string; status: string; employee?: { name?: string } }>;
};

type Employee = { id: string; name: string };
type Employment = { id: string; employeeId: string; employee?: { name?: string } };

export default function ContrachequeBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignForm, setAssignForm] = useState({
    employeeId: "",
    employmentId: "",
    pageFrom: "",
    pageTo: "",
  });
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const { data } = await api.get<BatchDetail>(`/rh/payslips/batches/${batchId}`);
      setBatch(data);
      if (data.tenantId) {
        const [emps, empls] = await Promise.all([
          api.get<Employee[]>(`/rh/employees?tenantId=${encodeURIComponent(data.tenantId)}`),
          api.get<Employment[]>(`/rh/employments?tenantId=${encodeURIComponent(data.tenantId)}`),
        ]);
        setEmployees(Array.isArray(emps.data) ? emps.data : []);
        setEmployments(Array.isArray(empls.data) ? empls.data : []);
      }
    } catch {
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const addAssignment = async () => {
    if (!batch || !assignForm.employeeId || !assignForm.pageFrom || !assignForm.pageTo) {
      setFeedback({ open: true, title: "Atenção", message: "Preencha colaborador e páginas." });
      return;
    }
    const assignments = [
      ...batch.pageAssignments.map((a) => ({
        employeeId: a.employeeId,
        employmentId: a.employmentId ?? undefined,
        pageFrom: a.pageFrom,
        pageTo: a.pageTo,
      })),
      {
        employeeId: assignForm.employeeId,
        employmentId: assignForm.employmentId || undefined,
        pageFrom: Number(assignForm.pageFrom),
        pageTo: Number(assignForm.pageTo),
      },
    ];
    try {
      await api.post(`/rh/payslips/batches/${batchId}/assign-pages`, { assignments });
      setAssignForm({ employeeId: "", employmentId: "", pageFrom: "", pageTo: "" });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar as páginas." });
    }
  };

  const extract = async () => {
    try {
      await api.post(`/rh/payslips/batches/${batchId}/extract`);
      setFeedback({ open: true, title: "Sucesso", message: "PDFs individuais gerados." });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Falha na extração." });
    }
  };

  const transitionIndividual = async (id: string, toStatus: string) => {
    try {
      await api.post(`/rh/payslips/individuals/${id}/transition`, { toStatus });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Transição não permitida." });
    }
  };

  const openPdf = (id: string) => {
    window.open(`/api/rh/payslips/individuals/${id}/download`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!batch) {
    return <p className="text-muted-foreground">Lote não encontrado.</p>;
  }

  const employmentOptions = employments
    .filter((e) => e.employeeId === assignForm.employeeId || !assignForm.employeeId)
    .map((e) => ({ value: e.id, label: e.employee?.name ?? e.id }));

  return (
    <div className="space-y-6 max-w-5xl">
      <Button variant="ghost" asChild className="min-h-[44px]">
        <Link href="/dashboard/adm/rh?tab=contracheques">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Link>
      </Button>

      <div className="text-sm space-y-1">
        <p className="font-medium">{batch.bulkFileName}</p>
        <p className="text-muted-foreground">
          {formatDateDayMonYear(batch.referenceMonth)} · {PAYSLIP_STATUS_LABELS[batch.status] ?? batch.status} ·{" "}
          {batch.pageCount ?? "?"} páginas
        </p>
      </div>

      <BatchSection title="Atribuição de páginas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <NativeSelectField
            placeholder="Colaborador"
            className="min-h-[44px]"
            options={employees.map((e) => ({ value: e.id, label: e.name }))}
            value={assignForm.employeeId}
            onChange={(e) => setAssignForm((f) => ({ ...f, employeeId: e.target.value, employmentId: "" }))}
          />
          <NativeSelectField
            placeholder="Vínculo (opcional)"
            className="min-h-[44px]"
            options={employmentOptions}
            value={assignForm.employmentId}
            onChange={(e) => setAssignForm((f) => ({ ...f, employmentId: e.target.value }))}
          />
          <Input type="number" placeholder="Página de" className="min-h-[44px] text-foreground" value={assignForm.pageFrom} onChange={(e) => setAssignForm((f) => ({ ...f, pageFrom: e.target.value }))} />
          <Input type="number" placeholder="Página até" className="min-h-[44px] text-foreground" value={assignForm.pageTo} onChange={(e) => setAssignForm((f) => ({ ...f, pageTo: e.target.value }))} />
          <Button type="button" className="min-h-[44px]" onClick={addAssignment}>
            Incluir
          </Button>
        </div>
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Páginas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.pageAssignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.employee?.name ?? a.employeeId}</TableCell>
                <TableCell>
                  {a.pageFrom}–{a.pageTo}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button type="button" className="min-h-[44px] mt-4" onClick={extract}>
          Extrair individuais
        </Button>
      </BatchSection>

      <BatchSection title="Individuais">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="min-w-[14rem]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.individuals.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.employee?.name ?? "—"}</TableCell>
                <TableCell>{PAYSLIP_STATUS_LABELS[i.status] ?? i.status}</TableCell>
                <TableCell className="flex flex-wrap gap-1">
                  {i.status === "EM_CONFERENCIA" && (
                    <Button type="button" size="sm" className="min-h-[44px]" onClick={() => transitionIndividual(i.id, "APROVADO")}>
                      Aprovar
                    </Button>
                  )}
                  {i.status === "APROVADO" && (
                    <Button type="button" size="sm" className="min-h-[44px]" onClick={() => transitionIndividual(i.id, "DISPONIBILIZADO")}>
                      Disponibilizar
                    </Button>
                  )}
                  {["EM_CONFERENCIA", "APROVADO", "DISPONIBILIZADO", "CIENCIA_PENDENTE", "CIENCIA_REALIZADA"].includes(i.status) && (
                    <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={() => openPdf(i.id)}>
                      PDF
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </BatchSection>

      <FeedbackModal open={feedback.open} onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))} title={feedback.title} message={feedback.message} />
    </div>
  );
}

function BatchSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border p-4 space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

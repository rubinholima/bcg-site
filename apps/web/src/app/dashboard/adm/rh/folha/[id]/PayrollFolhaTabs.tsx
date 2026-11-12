"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { DashboardDeptTabs } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { PAYROLL_STATUS_LABELS } from "./payroll-labels";
import { NativeSelect } from "@/components/ui/native-select";
import { PayrollEmployeeDetailDialog } from "../../components/PayrollEmployeeDetailDialog";

type PayrollDetail = {
  id: string;
  referenceMonth: string;
  status: string;
  responsibleName?: string | null;
  tenant?: { id?: string; name?: string };
  employeeSnapshots?: Array<{ id: string; employeeId: string; employmentId?: string; snapshot: Record<string, unknown> }>;
  adjustments?: Array<{
    id: string;
    employmentId?: string;
    adjustmentType: string;
    amount?: number | string | null;
    reason?: string | null;
  }>;
  accountingPackage?: { status?: string } | null;
  accountingHistory?: Array<{ action: string; createdAt: string; notes?: string | null }>;
  statusHistory?: Array<{ toStatus: string; createdAt: string; notes?: string | null; actorName?: string | null }>;
  financeLancamentoId?: string | null;
};

type FolhaSection =
  | "resumo"
  | "funcionarios"
  | "ajustes"
  | "horas"
  | "documentos"
  | "contabilidade"
  | "financeiro"
  | "historico";

const FOLHA_TABS: { id: FolhaSection; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "funcionarios", label: "Funcionários" },
  { id: "ajustes", label: "Ajustes" },
  { id: "horas", label: "Horas e Faltas" },
  { id: "documentos", label: "Documentos" },
  { id: "contabilidade", label: "Contabilidade" },
  { id: "financeiro", label: "Financeiro" },
  { id: "historico", label: "Histórico" },
];

type Props = { closingId: string };

export function PayrollFolhaTabs({ closingId }: Props) {
  const [section, setSection] = useState<FolhaSection>("resumo");
  const [detail, setDetail] = useState<PayrollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [finance, setFinance] = useState<{ linked: boolean; status?: string | null; valor?: number | null } | null>(
    null,
  );
  const [occurrences, setOccurrences] = useState<unknown[]>([]);
  const [documents, setDocuments] = useState<unknown[]>([]);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string; variant?: "error" | "success" }>({
    open: false,
    title: "",
    message: "",
  });
  const [adjForm, setAdjForm] = useState({
    employmentId: "",
    adjustmentType: "adicional",
    amount: "",
    reason: "",
  });
  const [detailSnapshot, setDetailSnapshot] = useState<{ id: string; name?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [det, fin, occ, docs] = await Promise.all([
        api.get<PayrollDetail>(`/rh/payroll-closings/${closingId}`),
        api
          .get<{ linked: boolean; status?: string | null; valor?: number | null }>(
            `/rh/payroll-closings/${closingId}/finance-status`,
          )
          .catch(() => ({ data: null })),
        api.get(`/rh/payroll-closings/${closingId}/occurrences`).catch(() => ({ data: [] })),
        api.get(`/rh/payroll-closings/${closingId}/documents`).catch(() => ({ data: [] })),
      ]);
      setDetail(det.data);
      setFinance(fin.data);
      setOccurrences(Array.isArray(occ.data) ? occ.data : []);
      setDocuments(Array.isArray(docs.data) ? docs.data : []);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [closingId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (path: string, success: string) => {
    try {
      await api.post(path);
      setFeedback({ open: true, title: "Sucesso", message: success, variant: "success" });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Não foi possível concluir.";
      setFeedback({ open: true, title: "Erro", message: msg, variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return <p className="text-muted-foreground">Fechamento não encontrado.</p>;
  }

  const pendingIssues =
    (detail.adjustments?.length ?? 0) === 0
      ? 0
      : detail.adjustments?.filter((a) => !a.reason?.trim()).length ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-sm text-muted-foreground">
          {formatDateDayMonYear(detail.referenceMonth)} · {detail.tenant?.name ?? ""}
        </p>
        <Button type="button" variant="outline" size="sm" className="min-h-[44px]" onClick={() => load()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <h2 className="text-lg font-semibold mt-4">Fechamento de folha</h2>

      <DashboardDeptTabs tabs={FOLHA_TABS} active={section} onChange={setSection} />

      {section === "resumo" && (
        <div className="space-y-3 pt-4 text-sm">
          <p>
            Status: <span className="font-medium">{PAYROLL_STATUS_LABELS[detail.status] ?? detail.status}</span>
          </p>
          <p>Responsável RH: {detail.responsibleName ?? "—"}</p>
          <p>Colaboradores no snapshot: {detail.employeeSnapshots?.length ?? 0}</p>
          <p>Pendências (ajustes sem motivo): {pendingIssues}</p>
          <p>Contabilidade: {detail.accountingPackage?.status ?? "—"}</p>
          <p>
            Financeiro:{" "}
            {finance?.linked ? `${finance.status ?? "vinculado"}${finance.valor != null ? ` · R$ ${finance.valor}` : ""}` : "Não encaminhado"}
          </p>
          <Button type="button" className="min-h-[44px]" onClick={() => runAction(`/rh/payroll-closings/${closingId}/prepare`, "Snapshots atualizados.")}>
            Preparar snapshots
          </Button>
        </div>
      )}

      {section === "funcionarios" && (
        <div className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Salário base</TableHead>
                <TableHead>Benefícios</TableHead>
                <TableHead>Ajustes</TableHead>
                <TableHead>Folha (nossa parte)</TableHead>
                <TableHead>Total est.</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.employeeSnapshots ?? []).map((s) => {
                const snap = s.snapshot ?? {};
                const emp = snap.employee as { id?: string; name?: string } | undefined;
                const job = snap.jobRole as { name?: string } | undefined;
                const mov = snap.athleteMovement as { ourPayrollAmount?: number } | undefined;
                const items = (snap.compensationItems as Array<{ amount?: number | string }> | undefined) ?? [];
                const benefits = items.reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
                const adjSum = (detail.adjustments ?? [])
                  .filter((a) => a.employmentId === s.employmentId)
                  .reduce((acc, a) => acc + Number(a.amount ?? 0), 0);
                const ourPart = mov?.ourPayrollAmount ?? Number(snap.salaryBase ?? 0);
                const estimated = ourPart + benefits + adjSum;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      {emp?.id ? (
                        <Link href={`/dashboard/adm/rh/colaboradores/${emp.id}`} className="text-violet-400 hover:underline">
                          {emp.name ?? "—"}
                        </Link>
                      ) : (
                        (emp?.name as string) ?? "—"
                      )}
                    </TableCell>
                    <TableCell>{job?.name ?? "—"}</TableCell>
                    <TableCell>{String(snap.contractType ?? "—")}</TableCell>
                    <TableCell>{snap.salaryBase != null ? String(snap.salaryBase) : "—"}</TableCell>
                    <TableCell>{benefits > 0 ? benefits.toFixed(2) : "—"}</TableCell>
                    <TableCell>{adjSum !== 0 ? adjSum.toFixed(2) : "—"}</TableCell>
                    <TableCell>{mov?.ourPayrollAmount != null ? String(mov.ourPayrollAmount) : "—"}</TableCell>
                    <TableCell>{estimated.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={() => setDetailSnapshot({ id: s.id, name: emp?.name })}>
                        Detalhe
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PayrollEmployeeDetailDialog
            open={!!detailSnapshot}
            onOpenChange={(o) => !o && setDetailSnapshot(null)}
            closingId={closingId}
            snapshotId={detailSnapshot?.id ?? ""}
            employeeName={detailSnapshot?.name}
          />
        </div>
      )}

      {section === "ajustes" && (
        <div className="pt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              className="text-foreground min-h-[44px]"
              placeholder="ID do vínculo"
              value={adjForm.employmentId}
              onChange={(e) => setAdjForm((f) => ({ ...f, employmentId: e.target.value }))}
            />
            <NativeSelect
              className="min-h-[44px]"
              value={adjForm.adjustmentType}
              onChange={(e) => setAdjForm((f) => ({ ...f, adjustmentType: e.target.value }))}
            >
              <option value="adicional">Adicional</option>
              <option value="desconto">Desconto</option>
              <option value="hora_extra">Hora extra</option>
              <option value="falta">Falta</option>
            </NativeSelect>
            <Input
              className="text-foreground min-h-[44px]"
              placeholder="Valor"
              value={adjForm.amount}
              onChange={(e) => setAdjForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Input
              className="text-foreground min-h-[44px]"
              placeholder="Motivo"
              value={adjForm.reason}
              onChange={(e) => setAdjForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            className="min-h-[44px]"
            onClick={async () => {
              try {
                await api.post(`/rh/payroll-closings/${closingId}/adjustments`, {
                  employmentId: adjForm.employmentId.trim(),
                  adjustmentType: adjForm.adjustmentType,
                  amount: adjForm.amount ? Number(adjForm.amount) : undefined,
                  reason: adjForm.reason || undefined,
                });
                setFeedback({ open: true, title: "Sucesso", message: "Ajuste registrado.", variant: "success" });
                await load();
              } catch {
                setFeedback({ open: true, title: "Erro", message: "Falha ao salvar ajuste.", variant: "error" });
              }
            }}
          >
            Adicionar ajuste
          </Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail.adjustments ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.adjustmentType}</TableCell>
                  <TableCell>{a.amount != null ? String(a.amount) : "—"}</TableCell>
                  <TableCell>{a.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] text-destructive"
                      onClick={async () => {
                        try {
                          await api.delete(`/rh/payroll-closings/${closingId}/adjustments/${a.id}`);
                          setFeedback({ open: true, title: "Sucesso", message: "Ajuste removido.", variant: "success" });
                          await load();
                        } catch {
                          setFeedback({ open: true, title: "Erro", message: "Falha ao excluir.", variant: "error" });
                        }
                      }}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {section === "horas" && (
        <div className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occurrences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                    Nenhuma ocorrência nesta competência.
                  </TableCell>
                </TableRow>
              ) : (
                occurrences.map((o, i) => {
                  const row = o as { id?: string; occurrenceDate?: string; occurrenceType?: string; hours?: number };
                  return (
                    <TableRow key={row.id ?? i}>
                      <TableCell>{row.occurrenceDate ? formatDateDayMonYear(row.occurrenceDate) : "—"}</TableCell>
                      <TableCell>{row.occurrenceType ?? "—"}</TableCell>
                      <TableCell>{row.hours != null ? String(row.hours) : "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {section === "documentos" && (
        <div className="pt-4 text-sm space-y-2">
          {documents.length === 0 ? (
            <p className="text-muted-foreground">Nenhum documento de folha cadastrado.</p>
          ) : (
            documents.map((d, i) => {
              const doc = d as { fileName?: string; documentType?: string };
              return (
                <p key={i}>
                  {doc.documentType ?? "doc"} — {doc.fileName ?? "arquivo"}
                </p>
              );
            })
          )}
        </div>
      )}

      {section === "contabilidade" && (
        <div className="pt-4 flex flex-wrap gap-2">
          <Button type="button" className="min-h-[44px]" onClick={() => runAction(`/rh/payroll-closings/${closingId}/accounting/prepare`, "Pronto para envio.")}>
            Preparar envio
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => runAction(`/rh/payroll-closings/${closingId}/accounting/send`, "Envio registrado.")}>
            Enviar / Registrar envio
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => runAction(`/rh/payroll-closings/${closingId}/accounting/return`, "Retorno registrado.")}>
            Registrar retorno
          </Button>
          <Button type="button" className="min-h-[44px]" variant="secondary" onClick={() => runAction(`/rh/payroll-closings/${closingId}/accounting/request-correction`, "Correção solicitada.")}>
            Solicitar correção
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => runAction(`/rh/payroll-closings/${closingId}/accounting/resend`, "Reenvio registrado.")}>
            Reenviar
          </Button>
          <Button type="button" className="min-h-[44px]" onClick={() => runAction(`/rh/payroll-closings/${closingId}/accounting/approve-return`, "Retorno aprovado.")}>
            Aprovar retorno
          </Button>
        </div>
      )}

      {section === "financeiro" && (
        <div className="pt-4 space-y-3 text-sm">
          <p>
            {finance?.linked
              ? `Obrigação vinculada — status: ${finance.status ?? "—"} (somente leitura).`
              : "Ainda não encaminhado ao Financeiro."}
          </p>
          <Button
            type="button"
            className="min-h-[44px]"
            disabled={Boolean(finance?.linked)}
            onClick={() => runAction(`/rh/payroll-closings/${closingId}/handoff-finance`, "Encaminhado ao Financeiro.")}
          >
            Encaminhar ao Financeiro
          </Button>
        </div>
      )}

      {section === "historico" && (
        <div className="pt-4 space-y-2 text-sm">
          {(detail.statusHistory ?? []).map((h) => (
            <p key={`${h.createdAt}-${h.toStatus}`}>
              {formatDateDayMonYear(h.createdAt)} — {PAYROLL_STATUS_LABELS[h.toStatus] ?? h.toStatus}
              {h.actorName ? ` · ${h.actorName}` : ""}
              {h.notes ? ` — ${h.notes}` : ""}
            </p>
          ))}
          {(detail.accountingHistory ?? []).map((h) => (
            <p key={`acc-${h.createdAt}-${h.action}`}>
              Contabilidade: {h.action} · {formatDateDayMonYear(h.createdAt)}
              {h.notes ? ` — ${h.notes}` : ""}
            </p>
          ))}
        </div>
      )}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}

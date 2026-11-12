"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";

type PayrollRow = {
  id: string;
  referenceMonth: string;
  status: string;
  tenant?: { name?: string };
  _count?: { employeeSnapshots?: number; adjustments?: number };
};

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  em_conferencia: "Em conferência",
  pronto_contabilidade: "Pronto para Contabilidade",
  enviado_contabilidade: "Enviado à Contabilidade",
  aguardando_retorno: "Aguardando retorno",
  retorno_recebido: "Retorno recebido",
  aprovado_rh: "Aprovado pelo RH",
  encaminhado_financeiro: "Encaminhado ao Financeiro",
  concluido: "Concluído",
  correcao_necessaria: "Correção necessária",
  reaberto: "Reaberto",
  cancelado: "Cancelado",
};

type Props = { tenantId: string };

export function PayrollClosingsPanel({ tenantId }: Props) {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const { data } = await api.get<PayrollRow[]>(`/rh/payroll-closings${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Competência</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Colaboradores</TableHead>
          <TableHead className="w-[100px]">Detalhe</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              Nenhum fechamento de folha encontrado.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{formatDateDayMonYear(r.referenceMonth)}</TableCell>
              <TableCell>{STATUS_LABEL[r.status] ?? r.status}</TableCell>
              <TableCell>{r.tenant?.name ?? "—"}</TableCell>
              <TableCell>{r._count?.employeeSnapshots ?? 0}</TableCell>
              <TableCell>
                <Link href={`/dashboard/adm/rh/folha/${r.id}`} className="text-sm underline">
                  Abrir
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

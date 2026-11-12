"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";

type PayrollDetail = {
  referenceMonth: string;
  status: string;
  tenant?: { name?: string };
  employeeSnapshots?: unknown[];
  adjustments?: unknown[];
  financeLancamentoId?: string | null;
};

export default function PayrollClosingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PayrollDetail | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<PayrollDetail>(`/rh/payroll-closings/${id}`);
        setDetail(data);
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Button type="button" variant="ghost" size="sm" asChild>
        <Link href="/dashboard/adm/rh">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao RH
        </Link>
      </Button>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !detail ? (
        <p className="text-muted-foreground">Fechamento não encontrado.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Folha — {formatDateDayMonYear(detail.referenceMonth)} · {detail.tenant?.name ?? ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>
                Status: <span className="font-medium">{detail.status}</span>
              </p>
              <p>Colaboradores no snapshot: {detail.employeeSnapshots?.length ?? 0}</p>
              <p>Ajustes: {detail.adjustments?.length ?? 0}</p>
              {detail.financeLancamentoId && (
                <p className="text-muted-foreground">Financeiro: {detail.financeLancamentoId}</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

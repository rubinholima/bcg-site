"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";

type Composition = {
  composition: {
    salaryBase: number;
    benefitsTotal: number;
    ourPayrollAmount: number;
    adjustmentsTotal: number;
    estimatedTotal: number;
  };
  snapshot: Record<string, unknown>;
  adjustments: Array<{ adjustmentType: string; amount?: number | string | null; reason?: string | null }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closingId: string;
  snapshotId: string;
  employeeName?: string;
};

export function PayrollEmployeeDetailDialog({ open, onOpenChange, closingId, snapshotId, employeeName }: Props) {
  const [data, setData] = useState<Composition | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !snapshotId) return;
    setLoading(true);
    api
      .get<Composition>(`/rh/payroll-closings/${closingId}/snapshots/${snapshotId}/composition`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, closingId, snapshotId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employeeName ?? "Composição da folha"}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
        ) : !data ? (
          <p className="text-muted-foreground text-sm">Não foi possível carregar.</p>
        ) : (
          <div className="space-y-3 text-sm">
            <p>Salário base: R$ {data.composition.salaryBase.toFixed(2)}</p>
            <p>Benefícios: R$ {data.composition.benefitsTotal.toFixed(2)}</p>
            <p>Nossa parte (atleta): R$ {data.composition.ourPayrollAmount.toFixed(2)}</p>
            <p>Ajustes: R$ {data.composition.adjustmentsTotal.toFixed(2)}</p>
            <p className="font-semibold">Total estimado: R$ {data.composition.estimatedTotal.toFixed(2)}</p>
            {data.adjustments.length > 0 && (
              <ul className="list-disc pl-5 text-muted-foreground">
                {data.adjustments.map((a, idx) => (
                  <li key={idx}>
                    {a.adjustmentType}: {a.amount ?? "—"} {a.reason ? `(${a.reason})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";

type Batch = {
  id: string;
  referenceMonth: string;
  bulkFileName: string;
  status: string;
  pageCount?: number | null;
  _count?: { individuals: number; pageAssignments: number };
};

type Props = { tenantId: string };

export function PayslipsPanel({ tenantId }: Props) {
  const [rows, setRows] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [referenceMonth, setReferenceMonth] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await api.get<Batch[]>(`/rh/payslips/batches?tenantId=${encodeURIComponent(tenantId)}`);
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

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !referenceMonth.trim()) {
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

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div>
          <label className="text-xs text-muted-foreground">Competência</label>
          <Input
            type="date"
            className="text-foreground min-h-[44px] mt-1"
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
          />
        </div>
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
            <TableHead>Páginas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Atribuições</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhum lote de contracheque.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{formatDateDayMonYear(b.referenceMonth)}</TableCell>
                <TableCell>{b.bulkFileName}</TableCell>
                <TableCell>{b.pageCount ?? "—"}</TableCell>
                <TableCell>{b.status.replace(/_/g, " ")}</TableCell>
                <TableCell>{b._count?.pageAssignments ?? 0}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <FeedbackModal open={feedback.open} onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))} title={feedback.title} message={feedback.message} />
    </div>
  );
}

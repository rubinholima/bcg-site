"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";

type WorkRegime = { id: string; code: string; name: string; active: boolean };
type ClockBatch = {
  id: string;
  referenceMonth: string;
  fileName: string;
  uploadedAt: string;
  status: string;
};

type Props = { tenantId: string };

export function TimeControlPanel({ tenantId }: Props) {
  const [regimes, setRegimes] = useState<WorkRegime[]>([]);
  const [batches, setBatches] = useState<ClockBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const [regimesRes, batchesRes] = await Promise.all([
        api.get<WorkRegime[]>(`/rh/time/work-regimes${qs}`),
        api.get<ClockBatch[]>(`/rh/time/clock-batches${qs}`),
      ]);
      setRegimes(Array.isArray(regimesRes.data) ? regimesRes.data : []);
      setBatches(Array.isArray(batchesRes.data) ? batchesRes.data : []);
    } catch {
      setRegimes([]);
      setBatches([]);
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
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium mb-2">Jornadas</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regimes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                  Nenhuma jornada cadastrada.
                </TableCell>
              </TableRow>
            ) : (
              regimes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.active ? "Sim" : "Não"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Espelhos PDF de ponto</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Enviado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                  Nenhum espelho recebido.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{formatDateDayMonYear(b.referenceMonth)}</TableCell>
                  <TableCell>{b.fileName}</TableCell>
                  <TableCell>{formatDateDayMonYear(b.uploadedAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { DashboardDeptTabs } from "@/components/dashboard/DashboardDeptHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { TIME_OCCURRENCE_TREATMENTS } from "@/lib/rh-labels";
import { hasRhCapability } from "@/lib/rh-capabilities";
import { useAuth } from "@/context/AuthContext";

type Tab = "jornadas" | "ocorrencias" | "banco" | "espelhos";

type WorkRegime = { id: string; code: string; name: string; active: boolean; description?: string | null };
type Occurrence = {
  id: string;
  employmentId: string;
  occurrenceType: string;
  occurrenceDate: string;
  hours?: number | string | null;
  treatment?: string | null;
  reason?: string | null;
};
type ClockBatch = { id: string; referenceMonth: string; fileName: string; uploadedAt?: string; status?: string };
type Employment = { id: string; employee?: { name?: string }; jobRole?: { name?: string } };

type Props = { tenantId: string };

export function TimeControlOperationalPanel({ tenantId }: Props) {
  const { modules, role } = useAuth();
  const canManage = hasRhCapability(modules, "rh_time_manage", role);
  const canBank = hasRhCapability(modules, "rh_time_bank_manage", role);
  const canClock = hasRhCapability(modules, "rh_time_clock_docs", role);

  const [tab, setTab] = useState<Tab>("jornadas");
  const [regimes, setRegimes] = useState<WorkRegime[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [batches, setBatches] = useState<ClockBatch[]>([]);
  const [employments, setEmployments] = useState<Employment[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const [regimeDialog, setRegimeDialog] = useState(false);
  const [regimeForm, setRegimeForm] = useState({ code: "", name: "", description: "" });

  const [occDialog, setOccDialog] = useState(false);
  const [occForm, setOccForm] = useState({
    employmentId: "",
    occurrenceType: "falta",
    occurrenceDate: "",
    hours: "",
    treatment: "DESCONTO_FOLHA",
    reason: "",
  });

  const [bankDialog, setBankDialog] = useState(false);
  const [bankEmploymentId, setBankEmploymentId] = useState("");
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const [bankMovements, setBankMovements] = useState<
    Array<{ id: string; movementType: string; hours: number | string; movementDate: string; reason?: string | null }>
  >([]);
  const [bankForm, setBankForm] = useState({
    movementType: "CREDIT" as "CREDIT" | "DEBIT",
    movementDate: "",
    hours: "",
    reason: "",
  });

  const [clockDialog, setClockDialog] = useState(false);
  const [clockBatchId, setClockBatchId] = useState<string | null>(null);
  const [clockLinks, setClockLinks] = useState("");
  const [clockMonth, setClockMonth] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      const [regimesRes, occRes, batchesRes, emplRes] = await Promise.all([
        api.get<WorkRegime[]>(`/rh/time/work-regimes${qs}`),
        api.get<Occurrence[]>(`/rh/time/occurrences${qs}`),
        canClock ? api.get<ClockBatch[]>(`/rh/time/clock-batches${qs}`) : Promise.resolve({ data: [] }),
        tenantId
          ? api.get<Employment[]>(`/rh/employments?tenantId=${encodeURIComponent(tenantId)}`)
          : Promise.resolve({ data: [] }),
      ]);
      setRegimes(Array.isArray(regimesRes.data) ? regimesRes.data : []);
      setOccurrences(Array.isArray(occRes.data) ? occRes.data : []);
      setBatches(Array.isArray(batchesRes.data) ? batchesRes.data : []);
      setEmployments(Array.isArray(emplRes.data) ? emplRes.data : []);
    } catch {
      setRegimes([]);
      setOccurrences([]);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, canClock]);

  useEffect(() => {
    load();
  }, [load]);

  const employmentOptions = employments.map((e) => ({
    value: e.id,
    label: `${e.employee?.name ?? e.id}${e.jobRole?.name ? ` — ${e.jobRole.name}` : ""}`,
  }));

  const saveRegime = async () => {
    if (!tenantId || !regimeForm.code.trim() || !regimeForm.name.trim()) {
      setFeedback({ open: true, title: "Atenção", message: "Informe código e nome." });
      return;
    }
    try {
      await api.post("/rh/time/work-regimes", {
        tenantId,
        code: regimeForm.code,
        name: regimeForm.name,
        description: regimeForm.description || undefined,
      });
      setRegimeDialog(false);
      setRegimeForm({ code: "", name: "", description: "" });
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível salvar a jornada." });
    }
  };

  const saveOccurrence = async () => {
    if (!occForm.employmentId || !occForm.occurrenceDate) {
      setFeedback({ open: true, title: "Atenção", message: "Vínculo e data são obrigatórios." });
      return;
    }
    try {
      await api.post("/rh/time/occurrences", {
        ...occForm,
        hours: occForm.hours ? Number(occForm.hours) : undefined,
      });
      setOccDialog(false);
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar a ocorrência." });
    }
  };

  const loadBank = async (employmentId: string) => {
    if (!employmentId) return;
    try {
      const { data } = await api.get<{ balanceHours: number; movements: typeof bankMovements }>(
        `/rh/time/time-bank/movements?employmentId=${encodeURIComponent(employmentId)}${tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : ""}`,
      );
      setBankBalance(data.balanceHours ?? 0);
      setBankMovements(Array.isArray(data.movements) ? data.movements : []);
    } catch {
      setBankBalance(null);
      setBankMovements([]);
    }
  };

  const saveBankMovement = async () => {
    if (!bankEmploymentId || !bankForm.movementDate || !bankForm.hours) {
      setFeedback({ open: true, title: "Atenção", message: "Preencha vínculo, data e horas." });
      return;
    }
    try {
      await api.post("/rh/time/time-bank/movements", {
        employmentId: bankEmploymentId,
        movementType: bankForm.movementType,
        movementDate: bankForm.movementDate,
        hours: Number(bankForm.hours),
        reason: bankForm.reason || undefined,
      });
      setBankDialog(false);
      await loadBank(bankEmploymentId);
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível lançar o movimento." });
    }
  };

  const uploadClock = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !tenantId || !clockMonth) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione competência e PDF." });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tenantId", tenantId);
    fd.append("referenceMonth", clockMonth);
    try {
      await api.post("/rh/time/clock-batches/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Falha no upload do espelho." });
    }
  };

  const saveClockLinks = async () => {
    if (!clockBatchId) return;
    const links = clockLinks
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [employmentId, notes] = line.split(";");
        return { employmentId: employmentId?.trim(), notes: notes?.trim() };
      });
    try {
      await api.post(`/rh/time/clock-batches/${clockBatchId}/employees`, { links });
      setClockDialog(false);
      await load();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível vincular colaboradores." });
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
  <>
      <DashboardDeptTabs
        tabs={[
          { id: "jornadas", label: "Jornadas" },
          { id: "ocorrencias", label: "Ocorrências" },
          { id: "banco", label: "Banco de Horas" },
          { id: "espelhos", label: "Espelhos" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "jornadas" && (
        <div className="pt-4 space-y-3">
          {canManage && (
            <Button type="button" size="sm" className="min-h-[44px]" onClick={() => setRegimeDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova jornada
            </Button>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regimes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.active ? "Sim" : "Não"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "ocorrencias" && (
        <div className="pt-4 space-y-3">
          {canManage && (
            <Button type="button" size="sm" className="min-h-[44px]" onClick={() => setOccDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova ocorrência
            </Button>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tratamento</TableHead>
                <TableHead>Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occurrences.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{formatDateDayMonYear(o.occurrenceDate)}</TableCell>
                  <TableCell>{o.occurrenceType}</TableCell>
                  <TableCell>{o.treatment ?? "—"}</TableCell>
                  <TableCell>{o.hours ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "banco" && (
        <div className="pt-4 space-y-4">
          <NativeSelectField
            value={bankEmploymentId}
            onChange={(e) => {
              setBankEmploymentId(e.target.value);
              void loadBank(e.target.value);
            }}
            placeholder="Selecione o vínculo…"
            options={employmentOptions}
            className="max-w-md min-h-[44px]"
          />
          {bankEmploymentId && (
            <p className="text-sm">
              Saldo atual:{" "}
              <span className="font-semibold text-foreground">{bankBalance != null ? `${bankBalance} h` : "—"}</span>
            </p>
          )}
          {canBank && bankEmploymentId && (
            <Button type="button" size="sm" className="min-h-[44px]" onClick={() => setBankDialog(true)}>
              Lançar movimento
            </Button>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatDateDayMonYear(m.movementDate)}</TableCell>
                  <TableCell>{m.movementType}</TableCell>
                  <TableCell>{m.hours}</TableCell>
                  <TableCell>{m.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "espelhos" && canClock && (
        <div className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div>
              <label className="text-xs text-muted-foreground">Competência</label>
              <Input type="date" className="text-foreground min-h-[44px] mt-1" value={clockMonth} onChange={(e) => setClockMonth(e.target.value)} />
            </div>
            <Input ref={fileRef} type="file" accept="application/pdf" className="text-foreground min-h-[44px]" />
            <Button type="button" className="min-h-[44px]" onClick={uploadClock}>
              <Upload className="h-4 w-4 mr-2" />
              Enviar espelho
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{formatDateDayMonYear(b.referenceMonth)}</TableCell>
                  <TableCell>{b.fileName}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      onClick={() => {
                        setClockBatchId(b.id);
                        setClockDialog(true);
                      }}
                    >
                      Vínculos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={regimeDialog} onOpenChange={setRegimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova jornada</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Código" value={regimeForm.code} onChange={(e) => setRegimeForm((f) => ({ ...f, code: e.target.value }))} className="text-foreground min-h-[44px]" />
            <Input placeholder="Nome" value={regimeForm.name} onChange={(e) => setRegimeForm((f) => ({ ...f, name: e.target.value }))} className="text-foreground min-h-[44px]" />
            <Input placeholder="Descrição (opcional)" value={regimeForm.description} onChange={(e) => setRegimeForm((f) => ({ ...f, description: e.target.value }))} className="text-foreground min-h-[44px]" />
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveRegime}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={occDialog} onOpenChange={setOccDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocorrência de ponto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <NativeSelectField
              value={occForm.employmentId}
              onChange={(e) => setOccForm((f) => ({ ...f, employmentId: e.target.value }))}
              placeholder="Vínculo"
              options={employmentOptions}
              className="min-h-[44px]"
            />
            <Input type="date" className="text-foreground min-h-[44px]" value={occForm.occurrenceDate} onChange={(e) => setOccForm((f) => ({ ...f, occurrenceDate: e.target.value }))} />
            <Input placeholder="Tipo (ex.: falta, atraso)" value={occForm.occurrenceType} onChange={(e) => setOccForm((f) => ({ ...f, occurrenceType: e.target.value }))} className="text-foreground min-h-[44px]" />
            <Input placeholder="Horas" type="number" value={occForm.hours} onChange={(e) => setOccForm((f) => ({ ...f, hours: e.target.value }))} className="text-foreground min-h-[44px]" />
            <NativeSelect value={occForm.treatment} onChange={(e) => setOccForm((f) => ({ ...f, treatment: e.target.value }))} className="min-h-[44px] text-foreground">
              {TIME_OCCURRENCE_TREATMENTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
            <Input placeholder="Motivo" value={occForm.reason} onChange={(e) => setOccForm((f) => ({ ...f, reason: e.target.value }))} className="text-foreground min-h-[44px]" />
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveOccurrence}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bankDialog} onOpenChange={setBankDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Movimento no banco de horas</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <NativeSelect value={bankForm.movementType} onChange={(e) => setBankForm((f) => ({ ...f, movementType: e.target.value as "CREDIT" | "DEBIT" }))} className="min-h-[44px] text-foreground">
              <option value="CREDIT">Crédito</option>
              <option value="DEBIT">Débito</option>
            </NativeSelect>
            <Input type="date" className="text-foreground min-h-[44px]" value={bankForm.movementDate} onChange={(e) => setBankForm((f) => ({ ...f, movementDate: e.target.value }))} />
            <Input type="number" placeholder="Horas" value={bankForm.hours} onChange={(e) => setBankForm((f) => ({ ...f, hours: e.target.value }))} className="text-foreground min-h-[44px]" />
            <Input placeholder="Motivo" value={bankForm.reason} onChange={(e) => setBankForm((f) => ({ ...f, reason: e.target.value }))} className="text-foreground min-h-[44px]" />
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveBankMovement}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clockDialog} onOpenChange={setClockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vínculos do espelho</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Uma linha por vínculo: employmentId; observação (opcional)</p>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            value={clockLinks}
            onChange={(e) => setClockLinks(e.target.value)}
          />
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveClockLinks}>
              Salvar vínculos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal open={feedback.open} onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))} title={feedback.title} message={feedback.message} />
    </>
  );
}

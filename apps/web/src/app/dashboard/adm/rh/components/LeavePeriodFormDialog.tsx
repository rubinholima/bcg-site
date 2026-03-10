"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { type EmploymentRow } from "./EmploymentFormDialog";

export interface LeavePeriodRow {
  id: string;
  employmentId: string;
  type: string;
  startDate: string;
  endDate: string;
  documentRef: string | null;
  catNumber: string | null;
  notes: string | null;
  status: string;
  employment?: { id: string; employeeId: string };
}

const LEAVE_TYPES = [
  { value: "vacation", label: "Férias" },
  { value: "sick_leave", label: "Licença saúde" },
  { value: "maternity", label: "Licença maternidade" },
  { value: "accident", label: "Acidente trabalho" },
  { value: "other", label: "Outro" },
] as const;

const LEAVE_STATUSES = ["planned", "approved", "in_progress", "completed", "cancelled"] as const;

interface LeavePeriodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employments: EmploymentRow[];
  edit?: LeavePeriodRow | null;
  onSuccess: () => void;
}

export function LeavePeriodFormDialog({
  open,
  onOpenChange,
  employments,
  edit,
  onSuccess,
}: LeavePeriodFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [employmentId, setEmploymentId] = useState("");
  const [type, setType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [documentRef, setDocumentRef] = useState("");
  const [catNumber, setCatNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("planned");

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setEmploymentId(edit.employmentId);
      setType(edit.type);
      setStartDate(edit.startDate.slice(0, 10));
      setEndDate(edit.endDate.slice(0, 10));
      setDocumentRef(edit.documentRef ?? "");
      setCatNumber(edit.catNumber ?? "");
      setNotes(edit.notes ?? "");
      setStatus(edit.status);
    } else {
      setEmploymentId(employments[0]?.id ?? "");
      setType("vacation");
      setStartDate("");
      setEndDate("");
      setDocumentRef("");
      setCatNumber("");
      setNotes("");
      setStatus("planned");
    }
  }, [open, edit, employments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employmentId?.trim() || !startDate || !endDate) return;
    setSaving(true);
    try {
      const payload = {
        employmentId,
        type,
        startDate: `${startDate}T12:00:00.000Z`,
        endDate: `${endDate}T12:00:00.000Z`,
        documentRef: documentRef.trim() || undefined,
        catNumber: catNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      };
      if (edit) {
        await api.patch(`/rh/leave-periods/${edit.id}`, payload);
      } else {
        await api.post("/rh/leave-periods", payload);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{edit ? "Editar férias/afastamento" : "Novo férias/afastamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leave-employment">Vínculo *</Label>
              <select
                id="leave-employment"
                required
                disabled={!!edit}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={employmentId}
                onChange={(e) => setEmploymentId(e.target.value)}
              >
                <option value="">Selecione</option>
                {employments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.employee?.name ?? e.employeeId} — {e.jobRole?.name} ({e.contractType})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leave-type">Tipo *</Label>
                <select
                  id="leave-type"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leave-status">Status</Label>
                <select
                  id="leave-status"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {LEAVE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leave-startDate">Data início *</Label>
                <Input
                  id="leave-startDate"
                  type="date"
                  className="text-foreground"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leave-endDate">Data fim *</Label>
                <Input
                  id="leave-endDate"
                  type="date"
                  className="text-foreground"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leave-documentRef">Ref. atestado/documento</Label>
              <Input
                id="leave-documentRef"
                value={documentRef}
                onChange={(e) => setDocumentRef(e.target.value)}
                placeholder="Referência ao documento"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leave-catNumber">Nº CAT (acidente trabalho)</Label>
              <Input
                id="leave-catNumber"
                value={catNumber}
                onChange={(e) => setCatNumber(e.target.value)}
                placeholder="Número do CAT"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="leave-notes">Observações</Label>
              <textarea
                id="leave-notes"
                className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {edit ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

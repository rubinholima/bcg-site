"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { TIME_OCCURRENCE_TREATMENTS } from "@/lib/rh-labels";
import { hasRhCapability } from "@/lib/rh-capabilities";
import { useAuth } from "@/context/AuthContext";

type Props = {
  employeeId: string;
  employmentId?: string;
  employments: Array<{ value: string; label: string }>;
  catalog: Array<{ id: string; name: string }>;
  onRefresh: () => void;
};

export function EmployeeTimeAndEpiSection({ employeeId, employmentId, employments, catalog, onRefresh }: Props) {
  const { modules, role } = useAuth();
  const canTime = hasRhCapability(modules, "rh_time_manage", role);
  const canEpi = hasRhCapability(modules, "rh_epi_delivery", role);

  const [occOpen, setOccOpen] = useState(false);
  const [epiOpen, setEpiOpen] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const [occForm, setOccForm] = useState({
    employmentId: employmentId ?? "",
    occurrenceType: "falta",
    occurrenceDate: "",
    hours: "",
    treatment: "DESCONTO_FOLHA",
    reason: "",
  });

  const [epiForm, setEpiForm] = useState({
    catalogItemId: "",
    quantity: "1",
    deliveryDate: "",
  });

  const saveOccurrence = async () => {
    try {
      await api.post("/rh/time/occurrences", {
        ...occForm,
        hours: occForm.hours ? Number(occForm.hours) : undefined,
      });
      setOccOpen(false);
      onRefresh();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar." });
    }
  };

  const saveEpi = async () => {
    try {
      await api.post("/rh/epi/deliveries", {
        employeeId,
        employmentId: occForm.employmentId || employmentId,
        catalogItemId: epiForm.catalogItemId,
        quantity: Number(epiForm.quantity) || 1,
        deliveryDate: epiForm.deliveryDate,
      });
      setEpiOpen(false);
      onRefresh();
    } catch {
      setFeedback({ open: true, title: "Erro", message: "Não foi possível registrar a entrega." });
    }
  };

  if (!canTime && !canEpi) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canTime && (
        <Button type="button" size="sm" className="min-h-[44px]" onClick={() => setOccOpen(true)}>
          Registrar ocorrência
        </Button>
      )}
      {canEpi && (
        <Button type="button" size="sm" variant="outline" className="min-h-[44px]" onClick={() => setEpiOpen(true)}>
          Registrar entrega EPI
        </Button>
      )}

      <Dialog open={occOpen} onOpenChange={setOccOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocorrência de ponto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <NativeSelectField
              className="min-h-[44px]"
              placeholder="Vínculo"
              options={employments}
              value={occForm.employmentId}
              onChange={(e) => setOccForm((f) => ({ ...f, employmentId: e.target.value }))}
            />
            <Input type="date" className="min-h-[44px] text-foreground" value={occForm.occurrenceDate} onChange={(e) => setOccForm((f) => ({ ...f, occurrenceDate: e.target.value }))} />
            <Input className="min-h-[44px] text-foreground" value={occForm.occurrenceType} onChange={(e) => setOccForm((f) => ({ ...f, occurrenceType: e.target.value }))} placeholder="Tipo" />
            <NativeSelect className="min-h-[44px] text-foreground" value={occForm.treatment} onChange={(e) => setOccForm((f) => ({ ...f, treatment: e.target.value }))}>
              {TIME_OCCURRENCE_TREATMENTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveOccurrence}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={epiOpen} onOpenChange={setEpiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrega de EPI</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <NativeSelectField
              className="min-h-[44px]"
              placeholder="Item"
              options={catalog.map((c) => ({ value: c.id, label: c.name }))}
              value={epiForm.catalogItemId}
              onChange={(e) => setEpiForm((f) => ({ ...f, catalogItemId: e.target.value }))}
            />
            <Input type="date" className="min-h-[44px] text-foreground" value={epiForm.deliveryDate} onChange={(e) => setEpiForm((f) => ({ ...f, deliveryDate: e.target.value }))} />
            <Input type="number" className="min-h-[44px] text-foreground" value={epiForm.quantity} onChange={(e) => setEpiForm((f) => ({ ...f, quantity: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-[44px]" onClick={saveEpi}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal open={feedback.open} onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))} title={feedback.title} message={feedback.message} />
    </div>
  );
}

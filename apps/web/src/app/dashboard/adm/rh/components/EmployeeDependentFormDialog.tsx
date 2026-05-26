"use client";

import { useEffect, useState } from "react";
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
import { FormGrid } from "@/components/dashboard/players/ExpandableSection";
import { type EmployeeDependentRow, isMinorUnder14 } from "@/lib/employee-types";
import { RhInlineDocumentPicker } from "./RhInlineDocumentPicker";

interface EmployeeDependentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edit?: EmployeeDependentRow | null;
  onSave: (row: EmployeeDependentRow) => void;
}

export function EmployeeDependentFormDialog({
  open,
  onOpenChange,
  edit,
  onSave,
}: EmployeeDependentFormDialogProps) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthCertificateFileUrl, setBirthCertificateFileUrl] = useState("");
  const [schoolAttendanceFileUrl, setSchoolAttendanceFileUrl] = useState("");
  const [vaccinationCardFileUrl, setVaccinationCardFileUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(edit?.name ?? "");
    setBirthDate(edit?.birthDate ? edit.birthDate.slice(0, 10) : "");
    setBirthCertificateFileUrl(edit?.birthCertificateFileUrl ?? "");
    setSchoolAttendanceFileUrl(edit?.schoolAttendanceFileUrl ?? "");
    setVaccinationCardFileUrl(edit?.vaccinationCardFileUrl ?? "");
    setError(null);
  }, [open, edit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) {
      setError("Informe nome e data de nascimento.");
      return;
    }
    if (!isMinorUnder14(birthDate)) {
      setError("Esta seção é apenas para filhos menores de 14 anos.");
      return;
    }
    onSave({
      ...(edit?.id ? { id: edit.id } : {}),
      name: name.trim().toLocaleUpperCase("pt-BR"),
      birthDate,
      birthCertificateFileUrl: birthCertificateFileUrl.trim() || undefined,
      schoolAttendanceFileUrl: schoolAttendanceFileUrl.trim() || undefined,
      vaccinationCardFileUrl: vaccinationCardFileUrl.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(48rem,calc(100vw-1.5rem))] max-h-[min(90vh,calc(100dvh-2rem))]">
        <form onSubmit={handleSubmit} className="min-w-0">
          <DialogHeader>
            <DialogTitle>{edit ? "Editar filho" : "Cadastrar filho"}</DialogTitle>
          </DialogHeader>

          <div className="min-w-0 space-y-4 py-4">
            <FormGrid cols={2}>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <Label htmlFor="dep-name">Nome do filho *</Label>
                <Input
                  id="dep-name"
                  value={name}
                  onChange={(e) => setName(e.target.value.toLocaleUpperCase("pt-BR"))}
                  className="uppercase"
                  required
                />
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <Label htmlFor="dep-birth">Data de nascimento *</Label>
                <Input
                  id="dep-birth"
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground h-10 max-w-xs"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <RhInlineDocumentPicker
                  label="Certidão de nascimento"
                  value={birthCertificateFileUrl}
                  onChange={setBirthCertificateFileUrl}
                />
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <RhInlineDocumentPicker
                  label="Declaração de frequência escolar"
                  value={schoolAttendanceFileUrl}
                  onChange={setSchoolAttendanceFileUrl}
                />
              </div>
              <div className="grid min-w-0 gap-2 sm:col-span-2">
                <RhInlineDocumentPicker
                  label="Cartão de vacina"
                  value={vaccinationCardFileUrl}
                  onChange={setVaccinationCardFileUrl}
                />
              </div>
            </FormGrid>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar filho</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

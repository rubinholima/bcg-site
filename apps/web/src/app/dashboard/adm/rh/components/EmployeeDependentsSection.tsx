"use client";

import { Baby, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExpandableSection } from "@/components/dashboard/players/ExpandableSection";
import { type EmployeeDependentRow } from "@/lib/employee-types";

interface EmployeeDependentsSectionProps {
  hasMinorChildren: boolean;
  onHasMinorChildrenChange: (value: boolean) => void;
  dependents: EmployeeDependentRow[];
  onDependentsChange: (next: EmployeeDependentRow[]) => void;
  onAddDependent: () => void;
  onEditDependent: (index: number) => void;
}

export function EmployeeDependentsSection({
  hasMinorChildren,
  onHasMinorChildrenChange,
  dependents,
  onDependentsChange,
  onAddDependent,
  onEditDependent,
}: EmployeeDependentsSectionProps) {
  const handleRemove = (index: number) => {
    onDependentsChange(dependents.filter((_, i) => i !== index));
  };

  return (
    <ExpandableSection
      title="Filhos menores de 14 anos"
      description="Salário-família e documentação exigida"
      badge={hasMinorChildren ? dependents.length : undefined}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm font-normal">Possui filho menor de 14 anos?</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={hasMinorChildren ? "default" : "outline"}
              onClick={() => onHasMinorChildrenChange(true)}
            >
              Sim
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!hasMinorChildren ? "default" : "outline"}
              onClick={() => {
                onHasMinorChildrenChange(false);
                onDependentsChange([]);
              }}
            >
              Não
            </Button>
          </div>
        </div>

        {hasMinorChildren ? (
          <div className="space-y-3">
            {dependents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cadastre cada filho com certidão de nascimento, declaração de frequência escolar e cartão de vacina.
              </p>
            ) : (
              <ul className="space-y-2">
                {dependents.map((dep, index) => (
                  <li
                    key={dep.id ?? `dep-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Baby className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium uppercase truncate">{dep.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Nascimento:{" "}
                          {dep.birthDate
                            ? new Date(`${dep.birthDate.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEditDependent(index)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onAddDependent}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar filho
            </Button>
          </div>
        ) : null}
      </div>
    </ExpandableSection>
  );
}

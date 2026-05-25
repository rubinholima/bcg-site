"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatProfileDate,
  isLoanedPlayer,
  normalizeLoanProfile,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";
import { ExpandableSection, FormGrid } from "./ExpandableSection";

interface PlayerLoanSectionProps {
  profile: PlayerRegistrationProfile;
  tenantName?: string | null;
  onProfileChange: (next: PlayerRegistrationProfile) => void;
}

function patchLoan(profile: PlayerRegistrationProfile, patch: Partial<PlayerRegistrationProfile["loan"]>) {
  return {
    ...profile,
    loan: { ...normalizeLoanProfile(profile.loan), ...patch },
  };
}

export function PlayerLoanSection({ profile, tenantName, onProfileChange }: PlayerLoanSectionProps) {
  const loan = normalizeLoanProfile(profile.loan);
  const isLoaned = isLoanedPlayer(profile);

  return (
    <ExpandableSection
      title="Empréstimo"
      description={
        isLoaned
          ? "Período, clube de destino e acompanhamento psicológico"
          : "Preencha quando a situação do atleta for Emprestado"
      }
      badge={isLoaned ? "Ativo" : undefined}
    >
      {!isLoaned ? (
        <p className="text-sm text-muted-foreground">
          Altere a situação para <strong>Emprestado</strong> em Identificação para registrar os dados do empréstimo.
        </p>
      ) : (
        <div className="space-y-4">
          {tenantName ? (
            <p className="text-sm text-muted-foreground">
              Clube de origem: <span className="font-medium text-foreground">{tenantName}</span>
            </p>
          ) : null}
          <FormGrid cols={3}>
            <div className="space-y-2 sm:col-span-2">
              <Label>Clube de destino</Label>
              <Input
                value={loan.destinationClub ?? ""}
                onChange={(e) =>
                  onProfileChange(patchLoan(profile, { destinationClub: e.target.value || undefined }))
                }
                placeholder="Nome do clube emprestador/receptor"
              />
            </div>
            <div className="space-y-2">
              <Label>Ajuda psicológica</Label>
              <Select
                value={
                  loan.psychologicalSupport === true
                    ? "sim"
                    : loan.psychologicalSupport === false
                      ? "nao"
                      : "none"
                }
                onValueChange={(v) =>
                  onProfileChange(
                    patchLoan(profile, {
                      psychologicalSupport: v === "sim" ? true : v === "nao" ? false : undefined,
                    }),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Início do empréstimo</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={loan.startDate ?? ""}
                onChange={(e) =>
                  onProfileChange(patchLoan(profile, { startDate: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Término do empréstimo</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={loan.endDate ?? ""}
                onChange={(e) =>
                  onProfileChange(patchLoan(profile, { endDate: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-2 flex flex-col justify-end pb-2 text-sm text-muted-foreground">
              {loan.startDate || loan.endDate ? (
                <span>
                  Período: {formatProfileDate(loan.startDate)} → {formatProfileDate(loan.endDate)}
                </span>
              ) : (
                <span>Informe as datas do empréstimo</span>
              )}
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={loan.notes ?? ""}
                onChange={(e) =>
                  onProfileChange(patchLoan(profile, { notes: e.target.value || undefined }))
                }
                placeholder="Detalhes do empréstimo, contato no clube destino, etc."
              />
            </div>
          </FormGrid>
        </div>
      )}
    </ExpandableSection>
  );
}

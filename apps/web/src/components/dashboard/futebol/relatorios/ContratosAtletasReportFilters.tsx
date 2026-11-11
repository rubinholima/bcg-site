"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { DashboardFilterBar, FilterBarField } from "@/components/dashboard/cup360/DashboardFilterBar";
import { REPORT_PRESETS } from "@/lib/athlete-contract-hub";
import {
  CONTRACT_STATUSES,
  EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS,
  FEDERATIVE_STATUS_OPTIONS,
  type AthleteContractReportFilterState,
} from "@/lib/athlete-contract-report-filters";

type PlayerOpt = { id: string; name: string; category?: string | null };
type TypeOpt = { id: string; name: string };
type UserOpt = { id: string; cognitoSub?: string | null; name?: string | null; username: string };

type Props = {
  tenantId: string;
  preset: string;
  onPresetChange: (v: string) => void;
  filters: AthleteContractReportFilterState;
  onFiltersChange: (next: AthleteContractReportFilterState) => void;
  players: PlayerOpt[];
  types: TypeOpt[];
  users: UserOpt[];
  loadingOptions: boolean;
  onApply: () => void;
  onClear: () => void;
  applying: boolean;
};

export function ContratosAtletasReportFilters({
  tenantId,
  preset,
  onPresetChange,
  filters,
  onFiltersChange,
  players,
  types,
  users,
  loadingOptions,
  onApply,
  onClear,
  applying,
}: Props) {
  function patch(partial: Partial<AthleteContractReportFilterState>) {
    onFiltersChange({ ...filters, ...partial });
  }

  return (
    <div className="space-y-3">
      <DashboardFilterBar
        actions={
          <>
            <Button type="button" size="sm" onClick={onApply} disabled={!tenantId || applying}>
              {applying ? "Carregando…" : "Aplicar"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClear} disabled={applying}>
              Limpar filtros
            </Button>
          </>
        }
      >
        <FilterBarField label="Preset" className="sm:max-w-[11rem]">
          <NativeSelect value={preset} onChange={(e) => onPresetChange(e.target.value)}>
            {REPORT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </NativeSelect>
        </FilterBarField>
        <FilterBarField label="Atleta" className="sm:max-w-[14rem]">
          <NativeSelectField
            value={filters.playerId}
            onChange={(e) => patch({ playerId: e.target.value })}
            placeholder={loadingOptions ? "Carregando…" : "Todos"}
            options={players.map((p) => ({
              value: p.id,
              label: p.category ? `${p.name} · ${p.category}` : p.name,
            }))}
          />
        </FilterBarField>
        <FilterBarField label="Categoria / equipe">
          <Input
            value={filters.category}
            onChange={(e) => patch({ category: e.target.value })}
            placeholder="Ex.: Sub-20"
          />
        </FilterBarField>
        <FilterBarField label="Tipo de contrato" className="sm:max-w-[12rem]">
          <NativeSelectField
            value={filters.contractTypeId}
            onChange={(e) => patch({ contractTypeId: e.target.value })}
            placeholder="Todos"
            options={types.map((t) => ({ value: t.id, label: t.name }))}
          />
        </FilterBarField>
        <FilterBarField label="Status contrato" className="sm:max-w-[11rem]">
          <NativeSelect value={filters.status} onChange={(e) => patch({ status: e.target.value })}>
            <option value="">Todos</option>
            {CONTRACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </FilterBarField>
        <FilterBarField label="Situação federativa" className="sm:max-w-[12rem]">
          <NativeSelect
            value={filters.federativeStatus}
            onChange={(e) => patch({ federativeStatus: e.target.value })}
          >
            <option value="">Todas</option>
            {FEDERATIVE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </NativeSelect>
        </FilterBarField>
        <FilterBarField label="Profissional / formação" className="sm:max-w-[10rem]">
          <NativeSelect
            value={filters.athleteSegment}
            onChange={(e) =>
              patch({ athleteSegment: e.target.value as AthleteContractReportFilterState["athleteSegment"] })
            }
          >
            <option value="">Todos</option>
            <option value="professional">Profissional</option>
            <option value="formation">Formação</option>
          </NativeSelect>
        </FilterBarField>
        <FilterBarField label="Clube">
          <Input
            value={filters.clubName}
            onChange={(e) => patch({ clubName: e.target.value })}
            placeholder="Nome do clube"
          />
        </FilterBarField>
        <FilterBarField label="Clube parceiro">
          <Input
            value={filters.partnerClubName}
            onChange={(e) => patch({ partnerClubName: e.target.value })}
            placeholder="Parceiro"
          />
        </FilterBarField>
        <FilterBarField label="Agente / intermediário">
          <Input
            value={filters.agentName}
            onChange={(e) => patch({ agentName: e.target.value })}
            placeholder="Nome"
          />
        </FilterBarField>
        <FilterBarField label="Responsável" className="sm:max-w-[12rem]">
          <NativeSelectField
            value={filters.responsibleUserId}
            onChange={(e) => patch({ responsibleUserId: e.target.value })}
            placeholder="Todos"
            options={users.map((u) => ({
              value: u.cognitoSub ?? u.id,
              label: u.name?.trim() || u.username,
            }))}
          />
        </FilterBarField>
        <FilterBarField label="Assinatura" className="sm:max-w-[10rem]">
          <NativeSelect
            value={filters.signatureStatus}
            onChange={(e) => patch({ signatureStatus: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="PENDING">Pendente</option>
            <option value="manual">Manual</option>
            <option value="SIGNED">Assinado</option>
          </NativeSelect>
        </FilterBarField>
        <FilterBarField label="Início (de)">
          <Input
            type="date"
            className="text-foreground"
            value={filters.startDateFrom}
            onChange={(e) => patch({ startDateFrom: e.target.value })}
          />
        </FilterBarField>
        <FilterBarField label="Início (até)">
          <Input
            type="date"
            className="text-foreground"
            value={filters.startDateTo}
            onChange={(e) => patch({ startDateTo: e.target.value })}
          />
        </FilterBarField>
        <FilterBarField label="Fim (de)">
          <Input
            type="date"
            className="text-foreground"
            value={filters.endDateFrom}
            onChange={(e) => patch({ endDateFrom: e.target.value })}
          />
        </FilterBarField>
        <FilterBarField label="Fim (até)">
          <Input
            type="date"
            className="text-foreground"
            value={filters.endDateTo}
            onChange={(e) => patch({ endDateTo: e.target.value })}
          />
        </FilterBarField>
        <FilterBarField label="Janela vencimento (dias)" className="sm:max-w-[8rem]">
          <Input
            type="number"
            min={1}
            value={filters.expirationWindowDays}
            onChange={(e) => patch({ expirationWindowDays: e.target.value })}
            placeholder="Ex.: 30"
          />
        </FilterBarField>
        <FilterBarField label="Pendência financeira" className="sm:max-w-[8rem]">
          <NativeSelect
            value={filters.financialPending ? "1" : "0"}
            onChange={(e) => patch({ financialPending: e.target.value === "1" })}
          >
            <option value="0">Não</option>
            <option value="1">Sim</option>
          </NativeSelect>
        </FilterBarField>
      </DashboardFilterBar>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Briefcase, ChevronDown, Link2, Pencil, Trash2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
import { getEmployeeTypeLabel } from "@/lib/employee-types";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  cadastroDisplayUpper,
  employeeCodeDisplay,
  employeeCpfDisplay,
  employeePhoneDisplay,
} from "@/lib/rh-employee-display";
import { cn } from "@/lib/utils";
import { type EmployeeRow } from "@/app/dashboard/adm/rh/components/EmployeeFormDialog";

interface FuncionariosGroupedListProps {
  employees: EmployeeRow[];
  onEdit: (employee: EmployeeRow) => void;
  onDelete: (id: string) => void;
  onLinkPlayer: (employee: EmployeeRow) => void;
}

function EmployeeTable({
  rows,
  hideTypeColumn,
  onEdit,
  onDelete,
  onLinkPlayer,
}: {
  rows: EmployeeRow[];
  hideTypeColumn?: boolean;
  onEdit: (employee: EmployeeRow) => void;
  onDelete: (id: string) => void;
  onLinkPlayer: (employee: EmployeeRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Foto</TableHead>
          <TableHead className="hidden sm:table-cell">Matrícula</TableHead>
          <TableHead>Nome</TableHead>
          {!hideTypeColumn ? <TableHead>Tipo</TableHead> : null}
          <TableHead className="hidden lg:table-cell">Futebol</TableHead>
          <TableHead className="hidden md:table-cell">CPF</TableHead>
          <TableHead className="hidden md:table-cell">E-mail</TableHead>
          <TableHead className="hidden sm:table-cell">Telefone</TableHead>
          <TableHead className="w-[120px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((emp) => (
          <ClickableTableRow key={emp.id} className="cursor-pointer" onClick={() => onEdit(emp)}>
            <TableCell>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                {emp.photoUrl ? (
                  <img src={getPublicImageUrl(emp.photoUrl)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <UserCircle className="h-5 w-5" />
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell font-mono text-xs uppercase">
              {employeeCodeDisplay(emp.code)}
            </TableCell>
            <TableCell className="font-medium uppercase">{cadastroDisplayUpper(emp.name)}</TableCell>
            {!hideTypeColumn ? <TableCell>{getEmployeeTypeLabel(emp.type)}</TableCell> : null}
            <TableCell className="hidden lg:table-cell">
              {emp.playerId ? (
                <Link
                  href={`/dashboard/cadastros/jogadores/${emp.playerId}/edit`}
                  className="text-sm text-primary hover:underline uppercase"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cadastroDisplayUpper(emp.player?.name ?? "Atleta")}
                </Link>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs uppercase"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkPlayer(emp);
                  }}
                >
                  Vincular
                </Button>
              )}
            </TableCell>
            <TableCell className="hidden md:table-cell">{employeeCpfDisplay(emp.cpf)}</TableCell>
            <TableCell className="hidden md:table-cell">{emp.email ?? "—"}</TableCell>
            <TableCell className="hidden sm:table-cell">{employeePhoneDisplay(emp.phone)}</TableCell>
            <TableRowActions align="left">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Vincular Futebol"
                  title="Vínculo com Futebol"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLinkPlayer(emp);
                  }}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(emp);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(emp.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableRowActions>
          </ClickableTableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TypeBlock({
  typeKey,
  employees,
  defaultOpen,
  onEdit,
  onDelete,
  onLinkPlayer,
}: {
  typeKey: string;
  employees: EmployeeRow[];
  defaultOpen?: boolean;
  onEdit: (employee: EmployeeRow) => void;
  onDelete: (id: string) => void;
  onLinkPlayer: (employee: EmployeeRow) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const label = getEmployeeTypeLabel(typeKey);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          <span className="text-sm font-medium">{label}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{employees.length}</span>
        </div>
      </button>
      {open ? (
        <div className="overflow-x-auto border-t border-border/60 bg-background/50 p-2 sm:p-3">
          <EmployeeTable
            rows={employees}
            hideTypeColumn
            onEdit={onEdit}
            onDelete={onDelete}
            onLinkPlayer={onLinkPlayer}
          />
        </div>
      ) : null}
    </div>
  );
}

function TeamBlock({
  teamName,
  teamLogoUrl,
  types,
  defaultOpen,
  onEdit,
  onDelete,
  onLinkPlayer,
}: {
  teamName: string;
  teamLogoUrl?: string | null;
  types: Array<{ key: string; employees: EmployeeRow[] }>;
  defaultOpen?: boolean;
  onEdit: (employee: EmployeeRow) => void;
  onDelete: (id: string) => void;
  onLinkPlayer: (employee: EmployeeRow) => void;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const total = types.reduce((acc, t) => acc + t.employees.length, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/20 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted">
            {teamLogoUrl ? (
              <img
                src={getPublicImageUrl(teamLogoUrl)}
                alt=""
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <Briefcase className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold uppercase text-foreground">{teamName}</p>
            <p className="text-xs text-muted-foreground">
              {types.length} tipo{types.length !== 1 ? "s" : ""} · {total} colaborador
              {total !== 1 ? "es" : ""}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/60 px-3 py-4 sm:px-4">
          {types.map((typeGroup, index) => (
            <TypeBlock
              key={typeGroup.key}
              typeKey={typeGroup.key}
              employees={typeGroup.employees}
              defaultOpen={index === 0}
              onEdit={onEdit}
              onDelete={onDelete}
              onLinkPlayer={onLinkPlayer}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const TYPE_ORDER = ["staff", "athlete", "dirigente"] as const;

function groupByType(employees: EmployeeRow[]) {
  const map = new Map<string, EmployeeRow[]>();
  for (const emp of employees) {
    const key = emp.type?.trim() || "staff";
    const list = map.get(key) ?? [];
    list.push(emp);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, rows]) => ({
      key,
      employees: rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    }))
    .sort((a, b) => {
      const ai = TYPE_ORDER.indexOf(a.key as (typeof TYPE_ORDER)[number]);
      const bi = TYPE_ORDER.indexOf(b.key as (typeof TYPE_ORDER)[number]);
      const aIdx = ai === -1 ? 99 : ai;
      const bIdx = bi === -1 ? 99 : bi;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return getEmployeeTypeLabel(a.key).localeCompare(getEmployeeTypeLabel(b.key), "pt-BR");
    });
}

export function FuncionariosGroupedList({
  employees,
  onEdit,
  onDelete,
  onLinkPlayer,
}: FuncionariosGroupedListProps) {
  const teams = useMemo(() => {
    const teamMap = new Map<
      string,
      { name: string; logoUrl?: string | null; employees: EmployeeRow[] }
    >();
    for (const emp of employees) {
      const key = emp.tenant.id;
      const name = emp.tenant?.name ?? key;
      const entry = teamMap.get(key) ?? { name, logoUrl: emp.tenant?.logoUrl ?? null, employees: [] };
      if (!entry.logoUrl && emp.tenant?.logoUrl) entry.logoUrl = emp.tenant.logoUrl;
      entry.employees.push(emp);
      teamMap.set(key, entry);
    }

    return [...teamMap.entries()]
      .map(([, value]) => ({
        teamName: value.name,
        teamLogoUrl: value.logoUrl,
        types: groupByType(value.employees),
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR"));
  }, [employees]);

  if (teams.length === 0) return null;

  return (
    <div className="space-y-4">
      {teams.map((team, index) => (
        <TeamBlock
          key={team.teamName}
          teamName={team.teamName}
          teamLogoUrl={team.teamLogoUrl}
          types={team.types}
          defaultOpen={teams.length === 1 || index === 0}
          onEdit={onEdit}
          onDelete={onDelete}
          onLinkPlayer={onLinkPlayer}
        />
      ))}
    </div>
  );
}

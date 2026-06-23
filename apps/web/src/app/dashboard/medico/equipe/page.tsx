"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, UserCircle, Loader2, Building2, Stethoscope, Mail } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { EquipeFilters } from "./EquipeFilters";
import { MEDICAL_STAFF_ROLES, getRegistryLabel } from "@/lib/medical-staff-roles";
import type { MedicalStaff } from "@/types/medical-staff";

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?";
}

function roleLabel(role: string): string {
  return MEDICAL_STAFF_ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function MedicoEquipePage() {
  const searchParams = useSearchParams();
  const [list, setList] = useState<MedicalStaff[]>([]);
  const [loading, setLoading] = useState(true);

  const tenantId = searchParams.get("tenantId") ?? "";
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();

  useEffect(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    api
      .get<MedicalStaff[]>(`/medical-staff?${params.toString()}`)
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = useMemo(() => {
    const withoutEstagiarios = list.filter((p) => p.role !== "estagiario");
    if (!search) return withoutEstagiarios;
    return withoutEstagiarios.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.specialty ?? "").toLowerCase().includes(search) ||
        (p.crmCoren ?? "").toLowerCase().includes(search)
    );
  }, [list, search]);

  const showSuccess = searchParams.get("success") === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-600 dark:text-green-400">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/dashboard/medico/equipe/new" className="shrink-0">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo profissional
          </Button>
        </Link>
      </div>

      <EquipeFilters tenantId={tenantId} search={search} />

      <Card>
        <CardHeader>
          <CardTitle>Lista de profissionais</CardTitle>
          <CardDescription>
            {filtered.length === 0
              ? "Nenhum profissional encontrado."
              : filtered.length === 1 ? "1 profissional cadastrado" : `${filtered.length} profissionais cadastrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stethoscope className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p className="font-medium">Nenhum profissional encontrado.</p>
              <p className="text-sm mt-1">
                {list.length === 0
                  ? "Cadastre o primeiro médico ou enfermeiro para usar em atendimentos."
                  : "Ajuste os filtros ou busque por outro nome."}
              </p>
              <Link href="/dashboard/medico/equipe/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar profissional
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>{getRegistryLabel(filtered[0]?.role ?? "")}</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <ClickableTableRow key={p.id} href={`/dashboard/medico/equipe/${p.id}/edit`}>
                    <TableCell>
                      {p.photoUrl ? (
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                          <img src={getPublicImageUrl(p.photoUrl)} alt="" className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                          {initials(p.name)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {roleLabel(p.role)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.specialty ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.crmCoren ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {p.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          {p.email}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {p.tenant ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {p.tenant.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Todos</span>
                      )}
                    </TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-1">
                        <Link href={`/dashboard/medico/equipe/${p.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Editar" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/medico/equipe/${p.id}/delete`}>
                          <Button variant="ghost" size="icon" title="Excluir" aria-label="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableRowActions>
                  </ClickableTableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

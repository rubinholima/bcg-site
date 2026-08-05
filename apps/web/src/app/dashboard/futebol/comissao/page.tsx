import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import { getStaffRoleLabel } from "@/lib/staff-roles";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { ComissaoFilters } from "./ComissaoFilters";

interface TechnicalStaffMember {
  id: string;
  name: string;
  photoUrl?: string | null;
  role: string;
  jobRole?: { id: string; name: string } | null;
  categories?: string[] | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
  licenseType?: string | null;
  licenseValidUntil?: string | null;
  contractEnd?: string | null;
}

async function getStaff(params: {
  tenantId?: string;
  category?: string;
  jobRoleId?: string;
  search?: string;
}): Promise<TechnicalStaffMember[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params.category) searchParams.set("category", params.category);
    if (params.jobRoleId) searchParams.set("jobRoleId", params.jobRoleId);
    if (params.search) searchParams.set("search", params.search);
    const { data } = await api.get<TechnicalStaffMember[]>(
      `/technical-staff?${searchParams.toString()}`
    );
    return data ?? [];
  } catch {
    return [];
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDateDayMonYear(date);
}

type ComissaoPageProps = {
  searchParams: Promise<{
    success?: string;
    tenantId?: string;
    category?: string;
    jobRoleId?: string;
    search?: string;
  }>;
};

export default async function ComissaoPage(props: ComissaoPageProps) {
  const { searchParams } = props;
  const params = await searchParams;
  const staff = await getStaff({
    tenantId: params.tenantId,
    category: params.category,
    jobRoleId: params.jobRoleId,
    search: params.search,
  });
  const showSuccess = params.success === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/dashboard/futebol/comissao/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo membro
          </Button>
        </Link>
      </div>
      <ComissaoFilters />

      <Card>
        <CardHeader>
          <CardTitle>Lista da comissão técnica</CardTitle>
          <CardDescription>
            {staff.length === 0
              ? "Nenhum membro cadastrado"
              : `${staff.length} membro${staff.length > 1 ? "s" : ""} cadastrado${staff.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum membro encontrado.</p>
              <Link href="/dashboard/futebol/comissao/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar primeiro membro
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>Categorias</TableHead>
                  <TableHead>Licença / Validade</TableHead>
                  <TableHead>Contrato até</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <ClickableTableRow key={s.id} href={`/dashboard/futebol/comissao/${s.id}/edit`}>
                    <TableCell>
                      {s.photoUrl ? (
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={getPublicImageUrl(s.photoUrl)}
                            alt=""
                            className="h-full w-full object-cover object-[center_20%]"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.jobRole?.name ?? getStaffRoleLabel(s.role)}</TableCell>
                    <TableCell>{s.tenant?.name ?? s.tenantId}</TableCell>
                    <TableCell>
                      {Array.isArray(s.categories) && s.categories.length
                        ? s.categories.map((c) => getCategoryLabel(c, "pt")).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {s.licenseType
                        ? `${s.licenseType}${s.licenseValidUntil ? ` até ${formatDate(s.licenseValidUntil)}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell>{formatDate(s.contractEnd)}</TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/futebol/comissao/${s.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/futebol/comissao/${s.id}/delete`}>
                          <Button variant="ghost" size="icon" aria-label="Excluir">
                            <Trash2 className="h-4 w-4 text-destructive" />
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

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { LogisticaFilters } from "./LogisticaFilters";

interface TravelLogisticsItem {
  id: string;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
  category?: string | null;
  matchDate: string;
  opponentName?: string | null;
  stadiumName?: string | null;
  city?: string | null;
  country?: string | null;
  championshipName?: string | null;
  distanceKm?: number | null;
  transportType?: string | null;
  hotelName?: string | null;
  estimatedCostTotal?: number | null;
  status: string;
}

const TRANSPORT_LABELS: Record<string, string> = {
  aereo_comercial: "Aéreo comercial",
  aereo_fretado: "Aéreo fretado",
  rodoviario: "Rodoviário",
  misto: "Misto",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

async function getLogistica(params: {
  tenantId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<TravelLogisticsItem[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params.status) searchParams.set("status", params.status);
    if (params.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params.toDate) searchParams.set("toDate", params.toDate);
    const { data } = await api.get<TravelLogisticsItem[]>(
      `/logistica?${searchParams.toString()}`
    );
    return data ?? [];
  } catch {
    return [];
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

type LogisticaPageProps = {
  searchParams: Promise<{
    success?: string;
    tenantId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

export default async function LogisticaPage(props: LogisticaPageProps) {
  const { searchParams } = props;
  const params = await searchParams;
  const items = await getLogistica({
    tenantId: params.tenantId,
    status: params.status,
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  const showSuccess = params.success === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logística</h1>
          <p className="text-muted-foreground">
            Planejamento de deslocamentos para competições fora: transporte, hospedagem, alimentação (aval nutrição) e custos — somente clubes
          </p>
        </div>
        <Link href="/dashboard/futebol/logistica/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo planejamento
          </Button>
        </Link>
      </div>

      <LogisticaFilters />

      <Card>
        <CardHeader>
          <CardTitle>Planejamentos de deslocamento</CardTitle>
          <CardDescription>
            {items.length === 0
              ? "Nenhum planejamento cadastrado"
              : `${items.length} planejamento${items.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum planejamento encontrado.</p>
              <Link href="/dashboard/futebol/logistica/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar primeiro planejamento
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data jogo</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Adversário / Local</TableHead>
                    <TableHead>Competição</TableHead>
                    <TableHead>Transporte</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Custo est.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.matchDate)}</TableCell>
                      <TableCell>{item.tenant?.name ?? item.tenantId}</TableCell>
                      <TableCell>
                        {item.category ? getCategoryLabel(item.category, "pt") : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          {item.opponentName && <span className="font-medium">{item.opponentName}</span>}
                          {item.city && (
                            <span className="text-muted-foreground text-sm ml-1">
                              ({item.city}
                              {item.country ? `, ${item.country}` : ""})
                            </span>
                          )}
                          {!item.opponentName && !item.city && "—"}
                        </div>
                      </TableCell>
                      <TableCell>{item.championshipName ?? "—"}</TableCell>
                      <TableCell>
                        {item.transportType
                          ? TRANSPORT_LABELS[item.transportType] ?? item.transportType
                          : "—"}
                      </TableCell>
                      <TableCell>{item.hotelName ?? "—"}</TableCell>
                      <TableCell>{formatCurrency(item.estimatedCostTotal)}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/futebol/logistica/${item.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/dashboard/futebol/logistica/${item.id}/delete`}>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Eye, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  formatContractDate,
  type PlayerContractRow,
  type PlayerContractsOverview,
} from "@/lib/player-contracts";
import {
  createTravelRowId,
  normalizeEconomicRights,
  type PlayerEconomicRight,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";
import { ExpandableSection } from "./ExpandableSection";

interface PlayerContractsSectionProps {
  playerId: string;
  tenantName?: string | null;
  profile: PlayerRegistrationProfile;
  onProfileChange: (next: PlayerRegistrationProfile) => void;
  canAccessJuridico: boolean;
  canAccessRh: boolean;
}

function ExecutionRing({ percent }: { percent: number | null }) {
  if (percent == null) return <span className="text-muted-foreground">—</span>;
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-9 w-9 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(hsl(var(--primary)) ${p * 3.6}deg, hsl(var(--muted)) 0deg)`,
        }}
      >
        <div className="absolute inset-1 flex items-center justify-center rounded-full bg-card text-[10px] font-medium">
          {p}%
        </div>
      </div>
    </div>
  );
}

export function PlayerContractsSection({
  playerId,
  tenantName,
  profile,
  onProfileChange,
  canAccessJuridico,
  canAccessRh,
}: PlayerContractsSectionProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<PlayerContractRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null);

  const economicRights = normalizeEconomicRights(profile, tenantName);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    api
      .get<PlayerContractsOverview>(`/players/${playerId}/contracts-overview`)
      .then((res) => {
        if (!cancelled) setContracts(Array.isArray(res.data?.contracts) ? res.data.contracts : []);
      })
      .catch(() => {
        if (!cancelled) {
          setContracts([]);
          setLoadError("Não foi possível carregar os contratos.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((row) =>
      [
        row.displayId,
        row.status,
        row.contractType,
        row.economicRightsClub,
        row.destinationClub,
        row.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [contracts, search]);

  const updateEconomicRights = (next: PlayerEconomicRight[]) => {
    onProfileChange({
      ...profile,
      contracts: { ...(profile.contracts ?? {}), economicRights: next },
    });
  };

  const contractLink = (row: PlayerContractRow) => {
    if (row.source === "juridico" && canAccessJuridico) {
      return `/dashboard/juridico/${playerId}`;
    }
    if (row.source === "rh" && canAccessRh) {
      return "/dashboard/adm/rh";
    }
    return null;
  };

  const canViewContractPdf = (row: PlayerContractRow) =>
    Boolean(row.juridicoDocumentId?.trim());

  const handleViewContract = async (row: PlayerContractRow) => {
    const docId = row.juridicoDocumentId?.trim();
    if (!docId) return;
    setOpeningPdfId(row.id);
    setLoadError(null);
    try {
      const res = await fetch(`/api/players/${playerId}/contract-documents/${docId}/file`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Não foi possível abrir o PDF do contrato.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao abrir PDF do contrato.");
    } finally {
      setOpeningPdfId(null);
    }
  };

  const actionSourceLabel = (row: PlayerContractRow) => {
    if (row.source === "juridico") return "Jurídico";
    if (row.source === "rh") return "RH";
    return null;
  };

  return (
    <ExpandableSection
      title="Contratos"
      description="Direitos econômicos e vínculos — sincronizado com Jurídico e RH"
      badge={contracts.length || undefined}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {canAccessJuridico && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/juridico/${playerId}`}>
                <ExternalLink className="mr-1 h-4 w-4" />
                Abrir Jurídico
              </Link>
            </Button>
          )}
          {canAccessRh && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/adm/rh">
                <ExternalLink className="mr-1 h-4 w-4" />
                Abrir RH
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Direitos econômicos</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direitos econômicos</TableHead>
                  <TableHead className="w-32">Percentual</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {economicRights.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      Não há dados
                    </TableCell>
                  </TableRow>
                ) : (
                  economicRights.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          value={row.clubName}
                          onChange={(e) => {
                            const next = [...economicRights];
                            next[index] = { ...next[index], clubName: e.target.value };
                            updateEconomicRights(next);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={row.percentage}
                          onChange={(e) => {
                            const next = [...economicRights];
                            next[index] = {
                              ...next[index],
                              percentage: Number(e.target.value) || 0,
                            };
                            updateEconomicRights(next);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={economicRights.length <= 1}
                          onClick={() =>
                            updateEconomicRights(economicRights.filter((r) => r.id !== row.id))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateEconomicRights([
                ...economicRights,
                { id: createTravelRowId(), clubName: "", percentage: 0 },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar clube
          </Button>
          <p className="text-xs text-muted-foreground">
            Salve o cadastro para persistir os direitos econômicos. Contratos vêm do Jurídico e do RH.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-foreground">Todos os contratos</p>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar"
                className="pl-9"
              />
            </div>
          </div>

          {loadError && (
            <p className="text-sm text-destructive">{loadError}</p>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Id</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término/Rescisão</TableHead>
                  <TableHead>Clube direitos econômicos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo de contrato</TableHead>
                  <TableHead>Clube de destino</TableHead>
                  <TableHead>Execução</TableHead>
                  <TableHead className="w-16 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Não há contratos. Cadastre no Jurídico ou no RH (vínculo por CPF do atleta).
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const href = contractLink(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.displayId}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatContractDate(row.startDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatContractDate(row.endDate)}
                        </TableCell>
                        <TableCell>{row.economicRightsClub?.trim() || "—"}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.contractType}</TableCell>
                        <TableCell>{row.destinationClub?.trim() || "—"}</TableCell>
                        <TableCell>
                          <ExecutionRing percent={row.executionPercent} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title={
                                canViewContractPdf(row)
                                  ? "Visualizar PDF do contrato"
                                  : "PDF ainda não disponível"
                              }
                              disabled={!canViewContractPdf(row) || openingPdfId === row.id}
                              onClick={() => void handleViewContract(row)}
                            >
                              {openingPdfId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            {href ? (
                              <Button variant="ghost" size="icon" asChild title="Abrir no departamento">
                                <Link href={href}>
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : actionSourceLabel(row) ? (
                              <span className="min-w-[4.5rem] text-xs text-muted-foreground">
                                {actionSourceLabel(row)}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
}

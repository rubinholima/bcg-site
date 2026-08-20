"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useLogisticaCadastrosLookups } from "@/hooks/useLogisticaCadastrosLookups";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTravelRowId,
  normalizeTravelProfile,
  type PlayerLoyaltyProgram,
  type PlayerPassport,
  type PlayerRegistrationProfile,
  type PlayerTravelVisa,
} from "@/lib/player-registration-profile";
import {
  formatTravelDate,
  formatTravelDestination,
  TRANSPORT_LABELS,
  TRAVEL_STATUS_LABELS,
  type PlayerTravelHistoryItem,
} from "@/lib/travel-logistics";
import { ExpandableSection } from "./ExpandableSection";

interface PlayerTravelTabProps {
  playerId: string;
  profile: PlayerRegistrationProfile;
  onProfileChange: (next: PlayerRegistrationProfile) => void;
  canAccessLogistica: boolean;
}

function patchTravel(
  profile: PlayerRegistrationProfile,
  patch: Partial<NonNullable<PlayerRegistrationProfile["travel"]>>,
): PlayerRegistrationProfile {
  const travel = normalizeTravelProfile(profile.travel);
  return {
    ...profile,
    travel: { ...travel, ...patch },
  };
}

function filterBySearch<T extends object>(
  rows: T[],
  query: string,
  keys: (keyof T)[],
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    keys.some((key) => String(row[key] ?? "").toLowerCase().includes(q)),
  );
}

function SectionSearch({
  value,
  onChange,
  placeholder = "Procurar",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

export function PlayerTravelTab({
  playerId,
  profile,
  onProfileChange,
  canAccessLogistica,
}: PlayerTravelTabProps) {
  const travel = normalizeTravelProfile(profile.travel);
  const lookups = useLogisticaCadastrosLookups();
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<PlayerTravelHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    api
      .get<PlayerTravelHistoryItem[]>(`/players/${playerId}/travel-history`)
      .then((res) => {
        if (!cancelled) setHistory(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
          setHistoryError("Não foi possível carregar o histórico de viagens.");
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const passports = useMemo(
    () => filterBySearch(travel.passports ?? [], search, ["number", "issuingCountry", "authority"]),
    [travel.passports, search],
  );

  const visas = useMemo(
    () =>
      filterBySearch(travel.visas ?? [], search, [
        "country",
        "visaType",
        "number",
        "passportNumber",
      ]),
    [travel.visas, search],
  );

  const loyaltyPrograms = useMemo(
    () =>
      filterBySearch(travel.loyaltyPrograms ?? [], search, [
        "transportCompany",
        "programName",
        "membershipNumber",
      ]),
    [travel.loyaltyPrograms, search],
  );

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => {
      const haystack = [
        item.opponentName,
        item.championshipName,
        item.city,
        item.country,
        item.hotelName,
        item.stadiumName,
        TRAVEL_STATUS_LABELS[item.status],
        TRANSPORT_LABELS[item.transportType ?? ""],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [history, search]);

  const updatePassports = (next: PlayerPassport[]) => {
    onProfileChange(patchTravel(profile, { passports: next }));
  };

  const updateVisas = (next: PlayerTravelVisa[]) => {
    onProfileChange(patchTravel(profile, { visas: next }));
  };

  const updateLoyalty = (next: PlayerLoyaltyProgram[]) => {
    onProfileChange(patchTravel(profile, { loyaltyPrograms: next }));
  };

  const setPreferredPassport = (id: string, preferred: boolean) => {
    const next = (travel.passports ?? []).map((p) => ({
      ...p,
      preferred: p.id === id ? preferred : preferred ? false : p.preferred,
    }));
    updatePassports(next);
  };

  const totalItems =
    (travel.passports?.length ?? 0) +
    (travel.visas?.length ?? 0) +
    (travel.loyaltyPrograms?.length ?? 0) +
    history.length;

  return (
    <ExpandableSection
      title="Viagens"
      description="Passaportes, vistos, programas de fidelidade e histórico de deslocamentos"
      badge={totalItems || undefined}
    >
      <div className="space-y-8">
        <SectionSearch value={search} onChange={setSearch} />

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Passaportes</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Passaporte</TableHead>
                  <TableHead>País emissor</TableHead>
                  <TableHead>Data de emissão</TableHead>
                  <TableHead>Validade até</TableHead>
                  <TableHead>Autoridade</TableHead>
                  <TableHead className="text-center">Preferencial</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {passports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Não há dados
                    </TableCell>
                  </TableRow>
                ) : (
                  passports.map((row) => {
                    const index = (travel.passports ?? []).findIndex((p) => p.id === row.id);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.number ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.passports ?? [])];
                              next[index] = { ...next[index], number: e.target.value };
                              updatePassports(next);
                            }}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.issuingCountry ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.passports ?? [])];
                              next[index] = { ...next[index], issuingCountry: e.target.value };
                              updatePassports(next);
                            }}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                            value={row.issueDate ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.passports ?? [])];
                              next[index] = { ...next[index], issueDate: e.target.value };
                              updatePassports(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                            value={row.validUntil ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.passports ?? [])];
                              next[index] = { ...next[index], validUntil: e.target.value };
                              updatePassports(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.authority ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.passports ?? [])];
                              next[index] = { ...next[index], authority: e.target.value };
                              updatePassports(next);
                            }}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={!!row.preferred}
                            onCheckedChange={(checked) =>
                              setPreferredPassport(row.id, checked === true)
                            }
                            aria-label="Passaporte preferencial"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updatePassports((travel.passports ?? []).filter((p) => p.id !== row.id))
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updatePassports([
                ...(travel.passports ?? []),
                { id: createTravelRowId(), preferred: (travel.passports ?? []).length === 0 },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar passaporte
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Vistos de viagem</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>País</TableHead>
                  <TableHead>Visto internacional</TableHead>
                  <TableHead>Nº visto</TableHead>
                  <TableHead>Data de emissão</TableHead>
                  <TableHead>Validade até</TableHead>
                  <TableHead>Nº passaporte</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Não há dados
                    </TableCell>
                  </TableRow>
                ) : (
                  visas.map((row) => {
                    const index = (travel.visas ?? []).findIndex((v) => v.id === row.id);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Input
                            value={row.country ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.visas ?? [])];
                              next[index] = { ...next[index], country: e.target.value };
                              updateVisas(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.visaTypeId ?? "none"}
                            onValueChange={(v) => {
                              const next = [...(travel.visas ?? [])];
                              if (v === "none") {
                                next[index] = {
                                  ...next[index],
                                  visaTypeId: undefined,
                                  visaType: "",
                                };
                              } else {
                                const vt = lookups.visaTypes.find((x) => x.id === v);
                                next[index] = {
                                  ...next[index],
                                  visaTypeId: v,
                                  visaType: vt?.name ?? row.visaType,
                                };
                              }
                              updateVisas(next);
                            }}
                            disabled={lookups.loading}
                          >
                            <SelectTrigger className="min-h-[44px] min-w-[140px]">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {lookups.visaTypes.map((vt) => (
                                <SelectItem key={vt.id} value={vt.id}>
                                  {vt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!row.visaTypeId && row.visaType ? (
                            <Input
                              className="mt-1"
                              value={row.visaType}
                              onChange={(e) => {
                                const next = [...(travel.visas ?? [])];
                                next[index] = { ...next[index], visaType: e.target.value };
                                updateVisas(next);
                              }}
                              placeholder="Texto livre (legado)"
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.number ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.visas ?? [])];
                              next[index] = { ...next[index], number: e.target.value };
                              updateVisas(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                            value={row.issueDate ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.visas ?? [])];
                              next[index] = { ...next[index], issueDate: e.target.value };
                              updateVisas(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                            value={row.validUntil ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.visas ?? [])];
                              next[index] = { ...next[index], validUntil: e.target.value };
                              updateVisas(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.passportNumber ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.visas ?? [])];
                              next[index] = { ...next[index], passportNumber: e.target.value };
                              updateVisas(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateVisas((travel.visas ?? []).filter((v) => v.id !== row.id))
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateVisas([...(travel.visas ?? []), { id: createTravelRowId() }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar visto
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Programas de fidelidade</p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Programa de milhas</TableHead>
                  <TableHead>Nº milhas</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loyaltyPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Não há dados
                    </TableCell>
                  </TableRow>
                ) : (
                  loyaltyPrograms.map((row) => {
                    const index = (travel.loyaltyPrograms ?? []).findIndex((l) => l.id === row.id);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Select
                            value={row.transportCompanyId ?? "none"}
                            onValueChange={(v) => {
                              const next = [...(travel.loyaltyPrograms ?? [])];
                              if (v === "none") {
                                next[index] = {
                                  ...next[index],
                                  transportCompanyId: undefined,
                                  transportCompany: "",
                                  loyaltyProgramId: undefined,
                                  programName: "",
                                };
                              } else {
                                const tc = lookups.transportCompanies.find((x) => x.id === v);
                                next[index] = {
                                  ...next[index],
                                  transportCompanyId: v,
                                  transportCompany: tc?.name ?? "",
                                  loyaltyProgramId: undefined,
                                  programName: "",
                                };
                              }
                              updateLoyalty(next);
                            }}
                            disabled={lookups.loading}
                          >
                            <SelectTrigger className="min-h-[44px] min-w-[140px]">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {lookups.transportCompanies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!row.transportCompanyId && row.transportCompany ? (
                            <Input
                              className="mt-1"
                              value={row.transportCompany}
                              onChange={(e) => {
                                const next = [...(travel.loyaltyPrograms ?? [])];
                                next[index] = {
                                  ...next[index],
                                  transportCompany: e.target.value,
                                };
                                updateLoyalty(next);
                              }}
                              placeholder="Texto livre (legado)"
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.loyaltyProgramId ?? "none"}
                            onValueChange={(v) => {
                              const next = [...(travel.loyaltyPrograms ?? [])];
                              if (v === "none") {
                                next[index] = {
                                  ...next[index],
                                  loyaltyProgramId: undefined,
                                  programName: "",
                                };
                              } else {
                                const lp = lookups.loyaltyPrograms.find((x) => x.id === v);
                                next[index] = {
                                  ...next[index],
                                  loyaltyProgramId: v,
                                  programName: lp?.name ?? "",
                                  transportCompanyId:
                                    lp?.transportCompanyId || next[index].transportCompanyId,
                                  transportCompany: lp?.transportCompanyId
                                    ? lookups.transportCompanies.find(
                                        (c) => c.id === lp.transportCompanyId,
                                      )?.name ?? next[index].transportCompany
                                    : next[index].transportCompany,
                                };
                              }
                              updateLoyalty(next);
                            }}
                            disabled={lookups.loading}
                          >
                            <SelectTrigger className="min-h-[44px] min-w-[140px]">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              {lookups.loyaltyPrograms
                                .filter(
                                  (lp) =>
                                    !row.transportCompanyId ||
                                    !lp.transportCompanyId ||
                                    lp.transportCompanyId === row.transportCompanyId,
                                )
                                .map((lp) => (
                                  <SelectItem key={lp.id} value={lp.id}>
                                    {lp.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {!row.loyaltyProgramId && row.programName ? (
                            <Input
                              className="mt-1"
                              value={row.programName}
                              onChange={(e) => {
                                const next = [...(travel.loyaltyPrograms ?? [])];
                                next[index] = { ...next[index], programName: e.target.value };
                                updateLoyalty(next);
                              }}
                              placeholder="Texto livre (legado)"
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.membershipNumber ?? ""}
                            onChange={(e) => {
                              const next = [...(travel.loyaltyPrograms ?? [])];
                              next[index] = { ...next[index], membershipNumber: e.target.value };
                              updateLoyalty(next);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateLoyalty(
                                (travel.loyaltyPrograms ?? []).filter((l) => l.id !== row.id),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              updateLoyalty([...(travel.loyaltyPrograms ?? []), { id: createTravelRowId() }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Adicionar programa
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Histórico de viagens</p>
          <p className="text-xs text-muted-foreground">
            Sincronizado com o hub de logística (Futebol → Logística)
          </p>
          {historyError && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {historyError}
            </div>
          )}
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data do jogo</TableHead>
                  <TableHead>Adversário</TableHead>
                  <TableHead>Competição</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Transporte</TableHead>
                  <TableHead>Hotel</TableHead>
                  <TableHead>Status</TableHead>
                  {canAccessLogistica && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={canAccessLogistica ? 8 : 7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Carregando histórico...
                    </TableCell>
                  </TableRow>
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canAccessLogistica ? 8 : 7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Não há viagens vinculadas a este atleta no hub de logística.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatTravelDate(item.matchDate)}</TableCell>
                      <TableCell>{item.opponentName?.trim() || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span>{item.championshipName?.trim() || "—"}</span>
                          {item.category ? (
                            <p className="text-xs text-muted-foreground">
                              {getCategoryLabel(item.category, "pt")}
                            </p>
                          ) : null}
                          {item.isSubida ? (
                            <p className="text-xs font-medium text-sky-400">Subida</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatTravelDestination(item.city, item.country)}</TableCell>
                      <TableCell>
                        {item.transportType
                          ? TRANSPORT_LABELS[item.transportType] ?? item.transportType
                          : "—"}
                      </TableCell>
                      <TableCell>{item.hotelName?.trim() || "—"}</TableCell>
                      <TableCell>{TRAVEL_STATUS_LABELS[item.status] ?? item.status}</TableCell>
                      {canAccessLogistica && (
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link
                              href={`/dashboard/futebol/logistica/${item.id}/edit`}
                              title="Abrir no hub de logística"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {canAccessLogistica && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/futebol/logistica">Abrir hub de logística</Link>
            </Button>
          )}
        </div>
      </div>
    </ExpandableSection>
  );
}

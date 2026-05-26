"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, UserCircle, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPublicImageUrl } from "@/lib/media-url";
import { getEmployeeTypeLabel } from "@/lib/employee-types";
import { JuridicoFilters, type PersonOption } from "./JuridicoFilters";
import { JuridicoAllContractsCard } from "./JuridicoAllContractsCard";
import { JuridicoPersonContractsPanel } from "./JuridicoPersonContractsPanel";
import { LegalDocumentsTab } from "@/components/dashboard/LegalDocumentsTab";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
}

export default function JuridicoListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [persons, setPersons] = useState<PersonOption[]>([]);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<PersonOption | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);

  const handleSelectPersonFromFilters = (id: string) => {
    setSelectedPersonId(id);
    setSelectedFromList(false);
  };

  const tenantId = searchParams.get("tenantId") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const docType = searchParams.get("docType") ?? undefined;
  const docStatus = searchParams.get("docStatus") ?? undefined;

  useEffect(() => {
    if (!canAccessModule("juridico") && !authLoading) return;
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    setLoadingPersons(true);
    api
      .get<PersonOption[]>(`/juridico/person-options?${params.toString()}`)
      .then(({ data }) => setPersons(Array.isArray(data) ? data : []))
      .catch(() => setPersons([]))
      .finally(() => setLoadingPersons(false));
  }, [canAccessModule, authLoading, tenantId, category, search]);

  useEffect(() => {
    if (!selectedPersonId) {
      setSelectedPerson(null);
      setSelectedPlayer(null);
      return;
    }
    const fromList = persons.find((p) => p.id === selectedPersonId);
    setSelectedPerson(fromList ?? null);

    const playerId = fromList?.playerId;
    if (!playerId) {
      setSelectedPlayer(null);
      setLoadingPlayer(false);
      return;
    }

    setLoadingPlayer(true);
    api
      .get<Player>(`/players/${playerId}`)
      .then(({ data }) => setSelectedPlayer(data))
      .catch(() => setSelectedPlayer(null))
      .finally(() => setLoadingPlayer(false));
  }, [selectedPersonId, persons]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("juridico")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jurídico</h1>
          <p className="text-muted-foreground">
            Contratos de colaboradores (RH) e atletas. Filtre por clube ou veja todos, conforme seu acesso.
          </p>
        </div>
      </div>

      <JuridicoFilters
        persons={persons}
        selectedPersonId={selectedPersonId}
        onSelectPerson={handleSelectPersonFromFilters}
      />

      {(!selectedPersonId || selectedFromList) && (
        <JuridicoAllContractsCard
          tenantId={tenantId}
          docType={docType}
          docStatus={docStatus}
          onSelectPlayer={(id) => {
            const person = persons.find((p) => p.playerId === id);
            if (person) {
              setSelectedPersonId(person.id);
            }
            setSelectedFromList(true);
          }}
        />
      )}

      {selectedPersonId && !selectedFromList && (
        <>
          {loadingPlayer && selectedPerson?.playerId ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPerson ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="h-14 w-14 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-border">
                      {selectedPlayer?.photoUrl ? (
                        <img
                          src={getPublicImageUrl(selectedPlayer.photoUrl)}
                          alt={selectedPerson.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <User className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">
                        {selectedPlayer?.jerseyNumber
                          ? `${selectedPlayer.jerseyNumber} – `
                          : ""}
                        {selectedPerson.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedPerson.tenantName ?? selectedPlayer?.tenant?.name}
                        {selectedPerson.type
                          ? ` · ${getEmployeeTypeLabel(selectedPerson.type)}`
                          : ""}
                        {selectedPlayer?.category ? ` · ${selectedPlayer.category}` : ""}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <JuridicoPersonContractsPanel
                employeeId={selectedPerson.id}
                employeeName={selectedPerson.name}
                tenantId={tenantId}
              />

              {selectedPerson.playerId && selectedPlayer && (
                <LegalDocumentsTab
                  playerId={selectedPlayer.id}
                  playerName={selectedPlayer.name}
                />
              )}
            </div>
          ) : (
            <p className="text-muted-foreground py-6">Pessoa não encontrada.</p>
          )}
        </>
      )}

      {!selectedPersonId && !loadingPersons && persons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>
              Nenhum colaborador encontrado com os filtros selecionados. Ajuste Clube ou Categoria, ou cadastre no RH.
            </p>
            <Link href="/dashboard/adm/rh">
              <Button variant="outline" className="mt-4">
                Ir para RH
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

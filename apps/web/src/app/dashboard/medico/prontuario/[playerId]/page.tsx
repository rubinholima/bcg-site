"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicalTimelineList } from "@/components/dashboard/medico/MedicalTimelineList";
import { MedicalEncountersList } from "@/components/dashboard/medico/MedicalEncountersList";
import { MedicalPrescriptionHistoryPanel } from "@/components/dashboard/medico/MedicalPrescriptionHistoryPanel";
import { MedicalFisioContextPanel } from "@/components/dashboard/medico/MedicalFisioContextPanel";
import type { MedicalProntuarioTimeline } from "@/types/medical-encounter";
import { getPublicImageUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "timeline", label: "Timeline" },
  { id: "atendimentos", label: "Atendimentos" },
  { id: "prescricoes", label: "Prescrições" },
  { id: "fisio", label: "Fisio / Transição" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function MedicoProntuarioPlayerPage() {
  const params = useParams();
  const playerId = params.playerId as string;
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabId>("timeline");
  const [data, setData] = useState<MedicalProntuarioTimeline | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<MedicalProntuarioTimeline>(`/medical-encounters/timeline/${playerId}`)
      .then(({ data: d }) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("medico")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (!canAccessModule("medico") || authLoading) return;
    load();
  }, [canAccessModule, authLoading, load]);

  if (authLoading || !canAccessModule("medico")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profile = data?.medicalProfile ?? {};
  const player = data?.player;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/medico/prontuario"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Prontuário
          </Link>
          <div className="flex items-center gap-3">
            {player?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getPublicImageUrl(player.photoUrl)}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{player?.name ?? "Atleta"}</h1>
              {player?.category ? (
                <p className="text-sm text-muted-foreground">{player.category}</p>
              ) : null}
            </div>
          </div>
        </div>
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link href={`/dashboard/medico/prontuario/${playerId}/novo`}>
            <Plus className="mr-2 h-4 w-4" />
            Novo atendimento
          </Link>
        </Button>
      </div>

      {(profile.bloodType || profile.allergies || profile.medications) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil médico (cadastro)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {profile.bloodType ? (
              <p>
                <span className="text-muted-foreground">Tipo sanguíneo:</span>{" "}
                {String(profile.bloodType)}
              </p>
            ) : null}
            {profile.allergies ? (
              <p>
                <span className="text-muted-foreground">Alergias:</span>{" "}
                {String(profile.allergies)}
              </p>
            ) : null}
            {profile.medications ? (
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Medicamentos habituais:</span>{" "}
                {String(profile.medications)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-border/80 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "min-h-11 shrink-0 rounded-md px-3 text-sm font-medium",
              tab === t.id
                ? "bg-violet-500/15 text-violet-200"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {TABS.find((t) => t.id === tab)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tab === "timeline" ? (
            loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MedicalTimelineList items={data?.timeline ?? []} playerId={playerId} />
            )
          ) : null}
          {tab === "atendimentos" ? <MedicalEncountersList playerId={playerId} /> : null}
          {tab === "prescricoes" ? (
            <MedicalPrescriptionHistoryPanel playerId={playerId} />
          ) : null}
          {tab === "fisio" ? <MedicalFisioContextPanel playerId={playerId} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

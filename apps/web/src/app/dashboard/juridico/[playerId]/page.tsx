"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalDocumentsTab } from "@/components/dashboard/LegalDocumentsTab";
import { getPublicImageUrl } from "@/lib/media-url";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface PlayerData {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  tenant?: { id: string; name: string };
  category?: string | null;
}

export default function JuridicoPlayerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const { canAccessModule, loading: authLoading } = useAuth();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || (!canAccessModule("juridico") && !authLoading)) return;
    setLoading(true);
    api
      .get<PlayerData>(`/players/${id}`)
      .then(({ data }) => setPlayer(data))
      .catch(() => setPlayer(null))
      .finally(() => setLoading(false));
  }, [id, canAccessModule, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("juridico")) {
      router.replace("/403");
    }
  }, [canAccessModule, authLoading, router]);

  if (authLoading || !canAccessModule("juridico")) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!id) {
    router.replace("/dashboard/juridico");
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Jogador não encontrado.</p>
        <Link href="/dashboard/juridico">
          <Button variant="outline">Voltar para Jurídico</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/juridico">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-14 w-14 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-border">
          {player.photoUrl ? (
            <img
              src={getPublicImageUrl(player.photoUrl)}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <User className="h-7 w-7" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {player.jerseyNumber ? `${player.jerseyNumber} – ` : ""}
            {player.name}
          </h1>
          <p className="text-muted-foreground">
            {player.tenant?.name} {player.category ? `• ${player.category}` : ""}
          </p>
        </div>
      </div>

      <LegalDocumentsTab playerId={player.id} playerName={player.name} />
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface ConsultationEntry {
  date?: string;
  time?: string;
  link?: string;
  notes?: string;
  status?: string;
  type?: string;
  psychologist?: string;
}

function formatSessionDateTime(date?: string, time?: string): string {
  if (!date) return "—";
  try {
    const [y, m, day] = date.split("-");
    const d = `${day}/${m}/${y}`;
    return time ? `${d} ${time}` : d;
  } catch {
    return date;
  }
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function SessaoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const consultationId = searchParams.get("id") ?? "";
  const { canAccessModule, loading } = useAuth();
  const [playerName, setPlayerName] = useState<string>("");
  const [entry, setEntry] = useState<ConsultationEntry | null>(null);
  const [notes, setNotes] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [encerrada, setEncerrada] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const meetUrlFromParam = searchParams.get("meet");
  const meetUrl = meetUrlFromParam ? decodeURIComponent(meetUrlFromParam) : null;

  const openMeetOnRight = useCallback(() => {
    const url = meetUrl || entry?.link;
    if (!url || typeof window === "undefined") return;
    const sw = window.screen.availWidth ?? 1024;
    const sh = window.screen.availHeight ?? 768;
    const half = Math.floor(sw / 2);
    const screenX = window.screenX ?? window.screenLeft ?? 0;
    const screenY = window.screenY ?? window.screenTop ?? 0;
    const features = `popup=yes,width=${half},height=${sh},left=${screenX + half},top=${screenY},scrollbars=yes,resizable=yes`;
    const redirectUrl = `${window.location.origin}/dashboard/consultas/abrir-meet?url=${encodeURIComponent(url)}`;
    window.open(redirectUrl, "meet", features);
  }, [meetUrl, entry?.link]);

  useEffect(() => {
    if (!consultationId) {
      setLoadError("ID da consulta não informado.");
      return;
    }
    const match = consultationId.match(/^(.+)-(\d+)$/);
    if (!match) {
      setLoadError("ID da consulta inválido.");
      return;
    }
    const [, playerId, indexStr] = match;
    const index = parseInt(indexStr ?? "", 10);
    if (!playerId || isNaN(index) || index < 0) {
      setLoadError("ID da consulta inválido.");
      return;
    }

    api
      .get<{ name: string; onlineConsultations?: unknown[] }>(`/players/${playerId}`)
      .then(({ data }) => {
        setPlayerName(data?.name ?? "");
        const list = Array.isArray(data?.onlineConsultations) ? data.onlineConsultations as ConsultationEntry[] : [];
        const item = list[index];
        if (item) {
          setEntry(item);
          setNotes((item.notes as string) ?? "");
        } else {
          setLoadError("Consulta não encontrada.");
        }
      })
      .catch(() => setLoadError("Erro ao carregar a consulta."));
  }, [consultationId]);

  useEffect(() => {
    if (!entry || encerrada) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [entry, encerrada]);

  const handleEncerrar = useCallback(async () => {
    if (!consultationId || !entry) return;

    setEncerrando(true);
    try {
      await api.patch(`/consultations/${encodeURIComponent(consultationId)}`, {
        status: "completed",
        notes: notes.trim() || undefined,
        durationSeconds: elapsed,
      });
      setEncerrada(true);
      const consultasUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/consultas`;
      if (typeof window !== "undefined" && window.opener) {
        try {
          window.opener.location.href = consultasUrl;
          window.opener.focus();
        } catch {
          // cross-origin or closed
        }
      }
      setTimeout(() => {
        try {
          window.close();
        } catch {
          // pode falhar se a janela não foi aberta por script
        }
      }, 300);
    } catch {
      setLoadError("Erro ao encerrar a sessão.");
    } finally {
      setEncerrando(false);
    }
  }, [consultationId, entry, notes, elapsed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccessModule("saude")) {
    router.replace("/403");
    return null;
  }

  if (loadError && !entry) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{loadError}</p>
            <Link href="/dashboard/consultas">
              <Button variant="outline" className="mt-4">Voltar às consultas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (encerrada) {
    return (
      <div className="p-6 max-w-md mx-auto space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">Sessão encerrada. Status atualizado para Realizada.</p>
            <Link href="/dashboard/consultas">
              <Button className="mt-4">Voltar às consultas</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Sessão com {playerName}</h1>
        <Link href="/dashboard/consultas">
          <Button variant="ghost" size="sm">Sair</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col items-center gap-1">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <span className="text-3xl font-mono tabular-nums text-foreground">{formatElapsed(elapsed)}</span>
            <p className="text-xs text-muted-foreground">Cronômetro da sessão</p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Data e hora da consulta</p>
            <p className="text-sm font-medium">{formatSessionDateTime(entry?.date, entry?.time)}</p>
          </div>

          {(meetUrl || entry?.link) && (
            <p className="text-xs text-muted-foreground">
              O Meet deve abrir ao lado (metade direita). Se não abriu,{" "}
              <button
                type="button"
                className="underline text-primary hover:no-underline"
                onClick={openMeetOnRight}
              >
                clique aqui para abrir o Meet ao lado
              </button>
              .
            </p>
          )}

          <div>
            <Label className="text-sm font-medium">Anotações da sessão</Label>
            <p className="text-xs text-muted-foreground mb-1">Registre o que está sendo falado. Ao encerrar, as notas são salvas.</p>
            <textarea
              className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-y mt-1"
              placeholder="Anotações da sessão..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleEncerrar}
            disabled={encerrando}
          >
            {encerrando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Encerrar sessão
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Ao clicar, o status será alterado para <strong>Realizada</strong> e as anotações serão salvas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

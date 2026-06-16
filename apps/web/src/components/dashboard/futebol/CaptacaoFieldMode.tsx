"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Navigation, Radio, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Scout } from "@/lib/captacao-types";
import {
  clearPositionWatch,
  formatCoords,
  getCurrentPosition,
  isGeolocationAvailable,
  watchPosition,
  type GeoReading,
} from "@/lib/scout-geolocation";

const PING_INTERVAL_MS = 3 * 60 * 1000;

interface CaptacaoFieldModeProps {
  scouts: Scout[];
  onUpdated: () => void;
}

export function CaptacaoFieldMode({ scouts, onUpdated }: CaptacaoFieldModeProps) {
  const [scoutId, setScoutId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReading, setLastReading] = useState<GeoReading | null>(null);
  const [lastLabel, setLastLabel] = useState<string | null>(null);
  const watchRef = useRef<number>(-1);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendPing = useCallback(
    async (reading: GeoReading, source: "checkin" | "tracking") => {
      if (!scoutId) return;
      const { data } = await api.post<{ label?: string | null }>(
        `/captacao/scouts/${scoutId}/location`,
        {
          ...reading,
          source,
          reverseGeocode: true,
        },
      );
      if (data?.label) setLastLabel(data.label);
      onUpdated();
    },
    [scoutId, onUpdated],
  );

  const stopTracking = useCallback(async () => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    clearPositionWatch(watchRef.current);
    watchRef.current = -1;
    setTracking(false);
    if (scoutId) {
      try {
        await api.patch(`/captacao/scouts/${scoutId}/tracking`, { active: false });
        onUpdated();
      } catch {
        /* ignore */
      }
    }
  }, [scoutId, onUpdated]);

  useEffect(() => {
    return () => {
      void stopTracking();
    };
  }, [stopTracking]);

  async function handleCheckIn() {
    if (!scoutId) {
      setError("Selecione o captador.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reading = await getCurrentPosition();
      setLastReading(reading);
      await sendPing(reading, "checkin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no check-in.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartTracking() {
    if (!scoutId) {
      setError("Selecione o captador.");
      return;
    }
    if (!isGeolocationAvailable()) {
      setError("GPS não disponível. Use o celular com localização ativa.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/captacao/scouts/${scoutId}/tracking`, { active: true });
      const reading = await getCurrentPosition();
      setLastReading(reading);
      await sendPing(reading, "tracking");
      setTracking(true);

      watchRef.current = watchPosition(
        (r) => setLastReading(r),
        (msg) => setError(msg),
      );

      pingTimerRef.current = setInterval(() => {
        void getCurrentPosition()
          .then((r) => {
            setLastReading(r);
            return sendPing(r, "tracking");
          })
          .catch(() => {
            /* silencioso entre pings */
          });
      }, PING_INTERVAL_MS);

      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao iniciar modo campo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
          <Navigation className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Modo campo — GPS ao vivo</h3>
          <p className="text-sm text-muted-foreground">
            O captador registra onde está (estádio, peneira, torneio). Ideal no celular
            com GPS ligado. Atualiza o mapa em tempo real para a diretoria.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Captador em campo</Label>
          <Select
            value={scoutId || "none"}
            onValueChange={(v) => {
              void stopTracking();
              setScoutId(v === "none" ? "" : v);
              setLastReading(null);
              setLastLabel(null);
            }}
            disabled={tracking}
          >
            <SelectTrigger className="text-foreground">
              <SelectValue placeholder="Quem está em campo?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {scouts.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {lastReading && (
          <div className="rounded-lg border border-border bg-background/60 p-3 text-sm">
            <p className="flex items-center gap-1 font-medium">
              <MapPin className="h-4 w-4 text-emerald-400" />
              Última posição
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {formatCoords(lastReading.latitude, lastReading.longitude)}
            </p>
            {lastLabel && <p className="mt-1 text-xs">{lastLabel}</p>}
            {lastReading.accuracy != null && (
              <p className="text-[10px] text-muted-foreground">
                Precisão ~{Math.round(lastReading.accuracy)} m
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || tracking || !scoutId}
          onClick={() => void handleCheckIn()}
        >
          {busy && !tracking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="mr-2 h-4 w-4" />
          )}
          Check-in único
        </Button>
        {!tracking ? (
          <Button
            type="button"
            disabled={busy || !scoutId}
            onClick={() => void handleStartTracking()}
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Radio className="mr-2 h-4 w-4" />
            )}
            Iniciar rastreamento
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={() => void stopTracking()}>
            <Square className="mr-2 h-4 w-4" />
            Parar rastreamento
          </Button>
        )}
      </div>

      {tracking && (
        <p className="text-xs text-emerald-400">
          ● Ao vivo — ping a cada 3 min. Mantenha esta aba aberta no celular.
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import type { PhysioEvaluationTest } from "@/types/fisioterapia";
import { PHYSIO_PERIODIC_PROTOCOL_LABEL, PHYSIO_PROTOCOL_CLASSIFICATION_LABEL } from "@/lib/physio-periodic-labels";
import {
  computeHopTestBilateral,
  computePerimetriaBilateral,
  computeYBalanceBilateral,
  type BilateralClassification,
} from "@/lib/physio-periodic-bilateral";
import { cn } from "@/lib/utils";

export const PERIODIC_PROTOCOLS = [
  "y_balance",
  "t_test",
  "stop_down",
  "hop_test",
  "perimetria",
  "agachamento_bastao",
  "forca_kinology",
] as const;

export type PeriodicProtocol = (typeof PERIODIC_PROTOCOLS)[number];

export type PeriodicProtocolEntry = {
  protocol: PeriodicProtocol;
  payload: Record<string, unknown>;
  notes?: string;
};

function num(v: string): number {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function classificationClassName(classification: BilateralClassification): string {
  switch (classification) {
    case "aprovado":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "aceitavel":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    default:
      return "border-destructive/40 bg-destructive/10 text-destructive";
  }
}

function BilateralResultRows({
  rows,
}: {
  rows: { key: string; label: string; result: { absDiff: number; pctDisplay: string; classification: BilateralClassification } }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Diferença bilateral
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 px-2 py-1.5 text-sm"
          >
            <span className="font-medium">{row.label}</span>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Δ {row.result.absDiff}</span>
              <span className="text-muted-foreground">{row.result.pctDisplay}%</span>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium",
                  classificationClassName(row.result.classification),
                )}
              >
                {PHYSIO_PROTOCOL_CLASSIFICATION_LABEL[row.result.classification]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BilateralSummary({ protocol, payload }: { protocol: PeriodicProtocol; payload: Record<string, unknown> }) {
  if (protocol === "y_balance") {
    const rows = computeYBalanceBilateral(payload);
    return rows ? <BilateralResultRows rows={rows} /> : null;
  }
  if (protocol === "hop_test") {
    const computed = computeHopTestBilateral(payload);
    if (!computed) return null;
    return (
      <BilateralResultRows
        rows={[
          {
            key: "best",
            label: `Melhor salto (D ${computed.rightBest} · E ${computed.leftBest})`,
            result: computed.result,
          },
        ]}
      />
    );
  }
  if (protocol === "perimetria") {
    const rows = computePerimetriaBilateral(payload);
    return rows ? <BilateralResultRows rows={rows} /> : null;
  }
  return null;
}

function ProtocolFields({
  entry,
  onChange,
  playerId,
}: {
  entry: PeriodicProtocolEntry;
  onChange: (patch: Partial<PeriodicProtocolEntry>) => void;
  playerId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const p = entry.payload;

  const setPayload = (patch: Record<string, unknown>) =>
    onChange({ payload: { ...p, ...patch } });

  const uploadKinologyPdf = async (file: File) => {
    if (!playerId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("documentType", "exame_fisio");
      const { data } = await api.postForm<{ name: string; fileUrl: string; fileKey?: string }>(
        `/players/${playerId}/registration-documents`,
        formData,
      );
      setPayload({
        pdfUrl: data.fileUrl,
        pdfName: data.name,
        pdfKey: data.fileKey,
      });
    } finally {
      setUploading(false);
    }
  };

  switch (entry.protocol) {
    case "y_balance":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {(["right", "left"] as const).map((side) => (
              <div key={side} className="space-y-2 rounded border border-border/50 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {side === "right" ? "Direita" : "Esquerda"}
                </p>
                {(["frontal", "lateral", "cruzado"] as const).map((dir) => (
                  <div key={dir} className="grid gap-1">
                    <Label className="text-xs capitalize">{dir}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={String((p[side] as Record<string, number> | undefined)?.[dir] ?? "")}
                      onChange={(e) =>
                        setPayload({
                          [side]: {
                            ...((p[side] as Record<string, number>) ?? {}),
                            [dir]: num(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <BilateralSummary protocol="y_balance" payload={p} />
        </div>
      );
    case "t_test":
      return (
        <div className="grid gap-2 sm:max-w-xs">
          <Label>Tempo (segundos)</Label>
          <Input
            type="number"
            step="0.01"
            value={String(p.seconds ?? "")}
            onChange={(e) => setPayload({ seconds: num(e.target.value) })}
          />
        </div>
      );
    case "stop_down":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["frontal", "lateral"] as const).map((dir) => (
            <div key={dir} className="grid gap-1">
              <Label className="capitalize">{dir} (0–3)</Label>
              <NativeSelect
                value={String(p[dir] ?? "")}
                onChange={(e) => setPayload({ [dir]: Number(e.target.value) })}
              >
                <option value="">—</option>
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </NativeSelect>
            </div>
          ))}
        </div>
      );
    case "hop_test":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["rightJumps", "leftJumps"] as const).map((key) => (
              <div key={key} className="space-y-2 rounded border border-border/50 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {key === "rightJumps" ? "Direita (3 saltos cm)" : "Esquerda (3 saltos cm)"}
                </p>
                {[0, 1, 2].map((i) => (
                  <Input
                    key={i}
                    type="number"
                    step="0.1"
                    placeholder={`Salto ${i + 1}`}
                    value={String((p[key] as number[] | undefined)?.[i] ?? "")}
                    onChange={(e) => {
                      const arr = [...((p[key] as number[]) ?? [0, 0, 0])];
                      arr[i] = num(e.target.value);
                      setPayload({ [key]: arr });
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <BilateralSummary protocol="hop_test" payload={p} />
        </div>
      );
    case "perimetria":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["right", "left"] as const).map((side) => (
              <div key={side} className="space-y-2 rounded border border-border/50 p-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {side === "right" ? "Direita" : "Esquerda"}
                </p>
                {(["proximal", "medial", "distal"] as const).map((dir) => (
                  <div key={dir} className="grid gap-1">
                    <Label className="text-xs capitalize">{dir}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={String((p[side] as Record<string, number> | undefined)?.[dir] ?? "")}
                      onChange={(e) =>
                        setPayload({
                          [side]: {
                            ...((p[side] as Record<string, number>) ?? {}),
                            [dir]: num(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ))}
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Panturrilha direita</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={String(p.calfRight ?? "")}
                  onChange={(e) => setPayload({ calfRight: num(e.target.value) })}
                />
              </div>
              <div className="grid gap-1">
                <Label>Panturrilha esquerda</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={String(p.calfLeft ?? "")}
                  onChange={(e) => setPayload({ calfLeft: num(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <BilateralSummary protocol="perimetria" payload={p} />
        </div>
      );
    case "agachamento_bastao":
      return (
        <NativeSelect
          value={p.approved === true ? "aprovado" : p.approved === false ? "reprovado" : ""}
          onChange={(e) => setPayload({ approved: e.target.value === "aprovado" })}
        >
          <option value="">Selecione</option>
          <option value="aprovado">Aprovado</option>
          <option value="reprovado">Reprovado</option>
        </NativeSelect>
      );
    case "forca_kinology":
      return (
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadKinologyPdf(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!playerId || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Anexar PDF Kinology
          </Button>
          {p.pdfName ? (
            <p className="text-sm text-muted-foreground">{String(p.pdfName)}</p>
          ) : !playerId ? (
            <p className="text-xs text-muted-foreground">Selecione um atleta para anexar o PDF.</p>
          ) : null}
        </div>
      );
    default:
      return null;
  }
}

export function periodicEntriesToTests(entries: PeriodicProtocolEntry[]): PhysioEvaluationTest[] {
  return entries.map((e) => ({
    testType: e.protocol,
    bodyLocation: "geral",
    protocol: e.protocol,
    payload: e.payload,
    notes: e.notes?.trim() || undefined,
  }));
}

export function PhysioPeriodicProtocolBlock({
  entries,
  onChange,
  singlePlayerId,
}: {
  entries: PeriodicProtocolEntry[];
  onChange: (entries: PeriodicProtocolEntry[]) => void;
  singlePlayerId?: string;
}) {
  const addProtocol = (protocol: PeriodicProtocol) => {
    onChange([...entries, { protocol, payload: {} }]);
  };

  const updateEntry = (index: number, patch: Partial<PeriodicProtocolEntry>) => {
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const removeEntry = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Label>Protocolos *</Label>
        <NativeSelect
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value as PeriodicProtocol;
            if (v) {
              addProtocol(v);
              e.target.value = "";
            }
          }}
          className="max-w-xs"
        >
          <option value="">Adicionar protocolo…</option>
          {PERIODIC_PROTOCOLS.map((pr) => (
            <option key={pr} value={pr}>{PHYSIO_PERIODIC_PROTOCOL_LABEL[pr]}</option>
          ))}
        </NativeSelect>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Adicione ao menos um protocolo.</p>
      ) : (
        entries.map((entry, index) => (
          <div key={`${entry.protocol}-${index}`} className="space-y-2 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-sm">{PHYSIO_PERIODIC_PROTOCOL_LABEL[entry.protocol]}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => removeEntry(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <ProtocolFields
              entry={entry}
              onChange={(patch) => updateEntry(index, patch)}
              playerId={singlePlayerId}
            />
            <Input
              placeholder="Observações do protocolo"
              value={entry.notes ?? ""}
              onChange={(e) => updateEntry(index, { notes: e.target.value })}
            />
          </div>
        ))
      )}
    </div>
  );
}

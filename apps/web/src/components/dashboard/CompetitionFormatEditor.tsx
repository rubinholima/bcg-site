"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { StandingsFormulaEditor } from "@/components/dashboard/StandingsFormulaEditor";
import type {
  CompetitionFormat,
  CompetitionFormatType,
  CampeonatoFormat,
  CopaFormat,
  TorneioFormat,
  PhaseConfig,
  RegrasGerais,
} from "@/lib/competition-formats";
import { FORMAT_OPTIONS, emptyFormat } from "@/lib/competition-formats";

interface CompetitionFormatEditorProps {
  value: CompetitionFormat | null;
  onChange: (value: CompetitionFormat | null) => void;
  disabled?: boolean;
}

const TABELA_JOGOS_OPTIONS: { value: "rodadas" | "chaveamento" | "grupos_e_chaveamento"; label: string }[] = [
  { value: "rodadas", label: "Rodadas (turno/returno)" },
  { value: "chaveamento", label: "Chaveamento (mata-mata)" },
  { value: "grupos_e_chaveamento", label: "Grupos e chaveamento" },
];

const FASE_FORMATO_OPTIONS: { value: PhaseConfig["formato"]; label: string }[] = [
  { value: "eliminatoria", label: "Eliminatória" },
  { value: "jogo_unico", label: "Jogo único" },
  { value: "grupos", label: "Grupos" },
  { value: "todos_contra_todos", label: "Todos contra todos" },
];

export function CompetitionFormatEditor({
  value,
  onChange,
  disabled = false,
}: CompetitionFormatEditorProps) {
  const format = value ?? emptyFormat("campeonato");
  const type = format.formatType;

  const update = (patch: Partial<CompetitionFormat>) => {
    const next = { ...format, ...patch } as CompetitionFormat;
    const allowedKeys: Record<string, string[]> = {
      campeonato: [
        "formatType",
        "clubsCount",
        "turnoReturno",
        "rebaixamentoCount",
        "classificacaoOrdem",
        "classificacaoOrdemNome",
        "regras",
        "tabelaJogos",
      ],
      copa: [
        "formatType",
        "clubsCount",
        "numPhases",
        "jogoUnicoFases",
        "finalJogoUnico",
        "phases",
        "classificacaoOrdem",
        "classificacaoOrdemNome",
        "regras",
        "tabelaJogos",
      ],
      torneio: [
        "formatType",
        "clubsCount",
        "faseGrupos",
        "numGroups",
        "clubsPerGroup",
        "vagasPorGrupo",
        "faseFinalEliminatoria",
        "classificacaoGrupos",
        "classificacaoGruposNome",
        "classificacaoOrdem",
        "classificacaoOrdemNome",
        "regras",
        "tabelaJogos",
        "phases",
      ],
    };
    const keep = allowedKeys[next.formatType] ?? [];
    Object.keys(next).forEach((k) => {
      if (!keep.includes(k)) delete (next as unknown as Record<string, unknown>)[k];
    });
    onChange(next);
  };

  const regras = format.regras ?? {};
  const setRegras = (r: Partial<RegrasGerais>) =>
    update({ regras: { ...regras, ...r } } as Partial<CompetitionFormat>);

  const tabelaJogos = format.tabelaJogos ?? { tipo: "rodadas" as const };
  const setTabelaJogos = (t: Partial<typeof tabelaJogos>) =>
    update({ tabelaJogos: { ...tabelaJogos, ...t } } as Partial<CompetitionFormat>);

  const campeonatoHasClassificacao = type === "campeonato";
  const torneioFaseGrupos = type === "torneio" && (format as TorneioFormat).faseGrupos;
  const showClassificacao = campeonatoHasClassificacao || torneioFaseGrupos;

  return (
    <details className="group rounded-lg border border-border bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-foreground hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        Formato da disputa
      </summary>
      <div className="space-y-6 border-t border-border p-4">
        {/* Tipo e Participantes */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Tipo e participantes</h3>
        <div className="space-y-2">
          <Label>Tipo de formato</Label>
          <Select
            value={type}
            onValueChange={(v) => update(emptyFormat(v as CompetitionFormatType))}
            disabled={disabled}
          >
            <SelectTrigger className="max-w-sm text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="clubsCount">Quantidade de clubes</Label>
          <Input
            id="clubsCount"
            type="number"
            min={2}
            max={256}
            value={format.clubsCount ?? 8}
            onChange={(e) =>
              update({ clubsCount: Math.max(2, parseInt(e.target.value, 10) || 2) })
            }
            disabled={disabled}
            className="max-w-[120px] text-foreground"
          />
        </div>
      </section>

      {/* Campeonato: turno/returno e rebaixamento */}
      {type === "campeonato" && (
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Rodadas</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="turnoReturno"
                checked={!!(format as CampeonatoFormat).turnoReturno}
                onCheckedChange={(checked) =>
                  update({ turnoReturno: !!checked } as Partial<CompetitionFormat>)
                }
                disabled={disabled}
              />
              <Label htmlFor="turnoReturno" className="cursor-pointer font-normal">
                Turno e returno (ida e volta)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rebaixamentoCount">Rebaixamento (quantos descem)</Label>
              <Input
                id="rebaixamentoCount"
                type="number"
                min={0}
                max={20}
                value={(format as CampeonatoFormat).rebaixamentoCount ?? 0}
                onChange={(e) =>
                  update({
                    rebaixamentoCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                  } as Partial<CompetitionFormat>)
                }
                disabled={disabled}
                className="max-w-[80px] text-foreground"
              />
            </div>
          </div>
        </section>
      )}

      {/* Copa: fases e final */}
      {type === "copa" && (
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Fases</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="numPhases">Número de fases</Label>
              <Input
                id="numPhases"
                type="number"
                min={1}
                max={16}
                value={Math.max(1, ((format as CopaFormat).phases?.length ?? (format as CopaFormat).numPhases ?? 5))}
                onChange={(e) => {
                  const raw = e.target.valueAsNumber ?? parseInt(e.target.value, 10);
                  const newNum = Math.max(1, Math.min(16, Number.isNaN(raw) ? 1 : Math.round(raw)));
                  const copa = format as CopaFormat;
                  const currentPhases = copa.phases ?? [];
                  let newPhases: PhaseConfig[];
                  if (newNum > currentPhases.length) {
                    const toAdd = newNum - currentPhases.length;
                    const start = currentPhases.length + 1;
                    newPhases = [
                      ...currentPhases,
                      ...Array.from({ length: toAdd }, (_, i) => ({
                        numero: start + i,
                        nome: start + i === newNum ? "Final" : `Fase ${start + i}`,
                        formato: (start + i === newNum ? "jogo_unico" : "eliminatoria") as PhaseConfig["formato"],
                        jogoUnico: start + i === newNum,
                      })),
                    ];
                  } else if (newNum < currentPhases.length) {
                    newPhases = currentPhases.slice(0, newNum).map((p, i) => ({ ...p, numero: i + 1 }));
                  } else {
                    newPhases = currentPhases;
                  }
                  update({
                    numPhases: newNum,
                    phases: newPhases,
                  } as Partial<CompetitionFormat>);
                }}
                disabled={disabled}
                className="max-w-[80px] text-foreground"
              />
            </div>
            <div className="flex items-center gap-2 pt-8">
              <Checkbox
                id="finalJogoUnico"
                checked={!!(format as CopaFormat).finalJogoUnico}
                onCheckedChange={(checked) =>
                  update({ finalJogoUnico: !!checked } as Partial<CompetitionFormat>)
                }
                disabled={disabled}
              />
              <Label htmlFor="finalJogoUnico" className="cursor-pointer font-normal">
                Final em jogo único (campo neutro)
              </Label>
            </div>
          </div>
          <PhasesEditor
            key={`copa-phases-${(format as CopaFormat).phases?.length ?? 0}`}
            phases={(format as CopaFormat).phases ?? []}
            onChange={(phases) =>
              update({
                phases,
                numPhases: phases.length,
              } as Partial<CompetitionFormat>)
            }
            disabled={disabled}
          />
        </section>
      )}

      {/* Torneio: grupos e fases */}
      {type === "torneio" && (
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Grupos e fases</h3>
          <div className="flex items-center gap-2">
            <Checkbox
              id="faseGrupos"
              checked={!!(format as TorneioFormat).faseGrupos}
              onCheckedChange={(checked) =>
                update({ faseGrupos: !!checked } as Partial<CompetitionFormat>)
              }
              disabled={disabled}
            />
            <Label htmlFor="faseGrupos" className="cursor-pointer font-normal">
              Fase de grupos
            </Label>
          </div>
          {(format as TorneioFormat).faseGrupos && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numGroups">Quantidade de grupos</Label>
                <Input
                  id="numGroups"
                  type="number"
                  min={2}
                  max={16}
                  value={(format as TorneioFormat).numGroups ?? 2}
                  onChange={(e) =>
                    update({
                      numGroups: Math.max(2, parseInt(e.target.value, 10) || 2),
                    } as Partial<CompetitionFormat>)
                  }
                  disabled={disabled}
                  className="max-w-[80px] text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vagasPorGrupo">Vagas por grupo (avançam)</Label>
                <Input
                  id="vagasPorGrupo"
                  type="number"
                  min={1}
                  max={8}
                  value={(format as TorneioFormat).vagasPorGrupo ?? 2}
                  onChange={(e) =>
                    update({
                      vagasPorGrupo: Math.max(1, parseInt(e.target.value, 10) || 1),
                    } as Partial<CompetitionFormat>)
                  }
                  disabled={disabled}
                  className="max-w-[80px] text-foreground"
                />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox
              id="faseFinalEliminatoria"
              checked={!!(format as TorneioFormat).faseFinalEliminatoria}
              onCheckedChange={(checked) =>
                update({ faseFinalEliminatoria: !!checked } as Partial<CompetitionFormat>)
              }
              disabled={disabled}
            />
            <Label htmlFor="faseFinalEliminatoria" className="cursor-pointer font-normal">
              Fase final eliminatória
            </Label>
          </div>
          <PhasesEditor
            phases={(format as TorneioFormat).phases ?? []}
            onChange={(phases) => update({ phases } as Partial<CompetitionFormat>)}
            disabled={disabled}
          />
        </section>
      )}

      {/* Classificação (StandingsFormulaEditor) */}
      {showClassificacao && (
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Classificação</h3>
          {campeonatoHasClassificacao && (
            <StandingsFormulaEditor
              formula={format.classificacaoOrdem ?? ""}
              formulaName={format.classificacaoOrdemNome ?? ""}
              onFormulaChange={(v) =>
                update({ classificacaoOrdem: v } as Partial<CompetitionFormat>)
              }
              onFormulaNameChange={(v) =>
                update({ classificacaoOrdemNome: v } as Partial<CompetitionFormat>)
              }
              disabled={disabled}
            />
          )}
          {torneioFaseGrupos && (
            <StandingsFormulaEditor
              formula={(format as TorneioFormat).classificacaoGrupos ?? ""}
              formulaName={(format as TorneioFormat).classificacaoGruposNome ?? ""}
              onFormulaChange={(v) =>
                update({ classificacaoGrupos: v } as Partial<CompetitionFormat>)
              }
              onFormulaNameChange={(v) =>
                update({ classificacaoGruposNome: v } as Partial<CompetitionFormat>)
              }
              disabled={disabled}
            />
          )}
        </section>
      )}

      {/* Regras: pontos, prorrogação, pênaltis, texto */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Regras</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pontosVitoria">Pontos por vitória</Label>
            <Input
              id="pontosVitoria"
              type="number"
              min={0}
              max={10}
              value={regras.pontosVitoria ?? 3}
              onChange={(e) =>
                setRegras({
                  pontosVitoria: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              disabled={disabled}
              className="max-w-[80px] text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pontosEmpate">Pontos por empate</Label>
            <Input
              id="pontosEmpate"
              type="number"
              min={0}
              max={5}
              value={regras.pontosEmpate ?? 1}
              onChange={(e) =>
                setRegras({
                  pontosEmpate: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              disabled={disabled}
              className="max-w-[80px] text-foreground"
            />
          </div>
        </div>
        {(type === "copa" || type === "torneio") && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="prorrogacao"
                checked={!!regras.prorrogacao}
                onCheckedChange={(checked) => setRegras({ prorrogacao: !!checked })}
                disabled={disabled}
              />
              <Label htmlFor="prorrogacao" className="cursor-pointer font-normal">
                Prorrogação (em caso de empate)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="penaltis"
                checked={!!regras.penaltis}
                onCheckedChange={(checked) => setRegras({ penaltis: !!checked })}
                disabled={disabled}
              />
              <Label htmlFor="penaltis" className="cursor-pointer font-normal">
                Pênaltis (disputa de penaltis)
              </Label>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="regrasTexto">Regras em texto (Markdown aceito)</Label>
          <Textarea
            id="regrasTexto"
            value={regras.regrasTexto ?? ""}
            onChange={(e) => setRegras({ regrasTexto: e.target.value })}
            disabled={disabled}
            rows={4}
            className="min-h-[80px] text-foreground"
            placeholder="Ex.: Critérios de desempate, regras de fair play..."
          />
        </div>
      </section>

      {/* Tabela de jogos */}
      <section className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Tabela de jogos</h3>
        <div className="space-y-2">
          <Label>Tipo de estrutura</Label>
          <Select
            value={tabelaJogos.tipo}
            onValueChange={(v) =>
              setTabelaJogos({
                tipo: v as "rodadas" | "chaveamento" | "grupos_e_chaveamento",
              })
            }
            disabled={disabled}
          >
            <SelectTrigger className="max-w-sm text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABELA_JOGOS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {tabelaJogos.tipo === "rodadas" && (
          <div className="space-y-2">
            <Label htmlFor="numRodadas">Número de rodadas (turnos)</Label>
            <Input
              id="numRodadas"
              type="number"
              min={1}
              max={4}
              value={tabelaJogos.numRodadas ?? 2}
              onChange={(e) =>
                setTabelaJogos({
                  numRodadas: Math.max(1, Math.min(4, parseInt(e.target.value, 10) || 1)),
                })
              }
              disabled={disabled}
              className="max-w-[80px] text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Ex.: 1 = só turno; 2 = turno e returno
            </p>
          </div>
        )}
      </section>
    </div>
    </details>
  );
}

function PhasesEditor({
  phases,
  onChange,
  disabled,
}: {
  phases: PhaseConfig[];
  onChange: (phases: PhaseConfig[]) => void;
  disabled?: boolean;
}) {
  const addPhase = () => {
    const nextNum = phases.length + 1;
    onChange([
      ...phases,
      {
        numero: nextNum,
        nome: `Fase ${nextNum}`,
        formato: "eliminatoria",
      },
    ]);
  };
  const updatePhase = (i: number, p: Partial<PhaseConfig>) => {
    const next = [...phases];
    next[i] = { ...next[i]!, ...p };
    onChange(next);
  };
  const removePhase = (i: number) => {
    const next = phases
      .filter((_, j) => j !== i)
      .map((ph, j) => ({ ...ph, numero: j + 1 }));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Fases da competição</Label>
        <button
          type="button"
          onClick={addPhase}
          disabled={disabled}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          + Adicionar fase
        </button>
      </div>
      <div className="space-y-2">
        {phases.map((ph, i) => (
          <div
            key={i}
            className="flex flex-wrap items-start gap-2 rounded-md border border-border bg-background/50 p-3 sm:flex-nowrap"
          >
            <Input
              type="number"
              min={1}
              value={ph.numero}
              onChange={(e) =>
                updatePhase(i, { numero: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              disabled={disabled}
              className="w-14 shrink-0 text-foreground"
            />
            <Input
              placeholder="Nome (ex: Oitavas)"
              value={ph.nome}
              onChange={(e) => updatePhase(i, { nome: e.target.value })}
              disabled={disabled}
              className="min-w-0 flex-1 text-foreground"
            />
            <Select
              value={ph.formato}
              onValueChange={(v) =>
                updatePhase(i, { formato: v as PhaseConfig["formato"] })
              }
              disabled={disabled}
            >
              <SelectTrigger className="w-[160px] shrink-0 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FASE_FORMATO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(ph.formato === "eliminatoria" || ph.formato === "jogo_unico") && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={!!ph.jogoUnico}
                  onCheckedChange={(c) => updatePhase(i, { jogoUnico: !!c })}
                  disabled={disabled}
                />
                <Label className="cursor-pointer text-xs font-normal">Jogo único</Label>
              </div>
            )}
            {ph.formato === "grupos" && (
              <Input
                type="number"
                min={1}
                placeholder="Av."
                value={ph.numAdvance ?? ""}
                onChange={(e) =>
                  updatePhase(i, {
                    numAdvance: e.target.value
                      ? Math.max(1, parseInt(e.target.value, 10))
                      : undefined,
                  })
                }
                disabled={disabled}
                className="w-16 shrink-0 text-foreground"
              />
            )}
            <button
              type="button"
              onClick={() => removePhase(i)}
              disabled={disabled || phases.length <= 1}
              className=" shrink-0 text-destructive hover:underline disabled:opacity-50"
              aria-label="Remover fase"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
      {phases.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma fase configurada. Clique em &quot;+ Adicionar fase&quot; para começar.
        </p>
      )}
    </div>
  );
}

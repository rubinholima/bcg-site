"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelectField } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { ANALISE_DESEMPENHO_BASE } from "./AnaliseDesempenhoFilters";
import { AnalysisPrivateClipPlayer } from "./AnalysisPrivateClipPlayer";
import {
  OPPONENT_CLIP_GROUPS,
  OPPONENT_SET_PIECE_KINDS,
  OPPONENT_TACTICAL_SECTIONS,
  readProfileJsonText,
  readTransitionsSplit,
  writeProfileJsonText,
  writeTransitionsSplit,
} from "@/lib/performance-analysis-workflows-ui";
import {
  observedMatchSessionHref,
  OBSERVED_MATCH_STATUS_LABEL,
  type ObservedMatchAnalysisAction,
} from "@/lib/performance-analysis-observed-match-ui";
import {
  ClipCollectionReorderList,
  type ClipCollectionItemRow,
} from "./ClipCollectionReorderList";

type ObservedMatch = {
  id: string;
  matchDate: string | null;
  facedOpponentName: string | null;
  competition: string | null;
  homeAway: string | null;
  homeScore: number | null;
  awayScore: number | null;
  notes: string | null;
  videoLinks: Array<{ videoSource: { id: string; title: string } }>;
  taggedEventCount?: number;
  analysisStatus?: string;
  analysisStatusLabel?: string;
  analysisAction?: ObservedMatchAnalysisAction;
  analysisActionLabel?: string;
  analysisSessionId?: string | null;
};

type OpponentPlayer = {
  id: string;
  name: string;
  shirtNumber: number | null;
  position: string | null;
  likelyStarter: boolean;
  tacticalRole: string | null;
  strengths: string | null;
  weaknesses: string | null;
  observations: string | null;
};

type LineupEntry = {
  id?: string;
  opponentPlayerId?: string | null;
  name: string;
  shirtNumber?: number | null;
  position?: string | null;
  fieldX?: number | null;
  fieldY?: number | null;
  isStarter?: boolean;
  confidence?: string | null;
  notes?: string | null;
  sortOrder?: number;
};

type Bundle = {
  profile: Record<string, unknown> & {
    id: string;
    opponentName: string;
    category?: string | null;
    season?: number | null;
    notes?: string | null;
  };
  observedMatches: ObservedMatch[];
  players: OpponentPlayer[];
  lineups: Array<{ id: string; formation: string | null; notes: string | null; entries: LineupEntry[] }>;
  setPieces: Array<{
    id: string;
    kind: string;
    title: string | null;
    notes: string | null;
    clipId: string | null;
  }>;
  sessions: Array<{ id: string; status: string }>;
  sessionVideoSources: Array<{ id: string; title: string }>;
  sessionClips: Array<{ id: string; title: string; startMs: number; endMs: number }>;
  sessionEvents: Array<{ id: string; startMs: number; tagDefinition?: { label: string }; opponentPlayer?: { name: string } }>;
  clipCollection: {
    id: string;
    title: string;
    items: Array<{ id: string; groupKey: string; sortOrder: number; clipId: string; clip: { id: string; title: string } }>;
  } | null;
};

const TABS = [
  { id: "context", label: "Contexto" },
  { id: "matches", label: "Jogos observados" },
  { id: "tactical", label: "Perfil tático" },
  { id: "players", label: "Jogadores" },
  { id: "lineup", label: "Escalação provável" },
  { id: "setpieces", label: "Bolas paradas" },
  { id: "clips", label: "Clips" },
  { id: "evidence", label: "Evidências" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type Props = { profileId: string; querySuffix: string };

export function OpponentProfileWorkspace({ profileId, querySuffix }: Props) {
  const [tab, setTab] = useState<TabId>("context");
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const [profileDraft, setProfileDraft] = useState<Record<string, string>>({});
  const [transOff, setTransOff] = useState("");
  const [transDef, setTransDef] = useState("");

  const [matchDialog, setMatchDialog] = useState<ObservedMatch | "new" | null>(null);
  const [playerDialog, setPlayerDialog] = useState<OpponentPlayer | "new" | null>(null);
  const [setPieceDialog, setSetPieceDialog] = useState<Bundle["setPieces"][0] | "new" | null>(null);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [previewClipId, setPreviewClipId] = useState<string | null>(null);

  const [lineupFormation, setLineupFormation] = useState("");
  const [lineupEntries, setLineupEntries] = useState<LineupEntry[]>([]);
  const [dragEntryIdx, setDragEntryIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Bundle>(`/performance-analysis/opponent-profiles/${profileId}`);
      setBundle(data);
      const p = data.profile;
      const draft: Record<string, string> = {
        opponentName: String(p.opponentName ?? ""),
        category: String(p.category ?? ""),
        season: p.season != null ? String(p.season) : "",
        notes: String(p.notes ?? ""),
      };
      for (const sec of OPPONENT_TACTICAL_SECTIONS) {
        if (sec.key === "transitionsOff" || sec.key === "transitionsDef") continue;
        draft[sec.key] = readProfileJsonText(p[sec.key]);
      }
      const tr = readTransitionsSplit(p.transitions);
      setTransOff(tr.off);
      setTransDef(tr.def);
      setProfileDraft(draft);
      const lu = data.lineups.find((l) => l) ?? data.lineups[0];
      if (lu) {
        setLineupFormation(lu.formation ?? "");
        setLineupEntries(lu.entries.map((e) => ({ ...e })));
      } else {
        setLineupFormation("");
        setLineupEntries([]);
      }
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível carregar o perfil." });
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sessionId = bundle?.sessions[0]?.id;
  const sessionStatus = bundle?.sessions[0]?.status ?? "—";

  async function saveProfile() {
    if (!bundle) return;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        opponentName: profileDraft.opponentName,
        category: profileDraft.category || null,
        season: profileDraft.season ? Number(profileDraft.season) : null,
        notes: profileDraft.notes || null,
        transitions: writeTransitionsSplit(transOff, transDef),
      };
      patch.keyObservations = profileDraft.keyObservations?.trim() || null;
      for (const sec of OPPONENT_TACTICAL_SECTIONS) {
        if (
          sec.key === "transitionsOff" ||
          sec.key === "transitionsDef" ||
          sec.key === "keyObservations"
        ) {
          continue;
        }
        patch[sec.key] = writeProfileJsonText(profileDraft[sec.key] ?? "");
      }
      await api.patch(`/performance-analysis/opponent-profiles/${profileId}`, patch);
      await load();
    } catch (e) {
      setFeedback({
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function openAnalysis() {
    const { data } = await api.post<{ session: { id: string } }>(
      `/performance-analysis/opponent-profiles/${profileId}/open-analysis`,
    );
    window.location.href = `${ANALISE_DESEMPENHO_BASE}/sessoes/${data.session.id}${querySuffix}`;
  }

  async function saveObservedMatch(form: {
    id?: string;
    matchDate?: string;
    facedOpponentName?: string;
    competition?: string;
    homeAway?: string;
    homeScore?: string;
    awayScore?: string;
    notes?: string;
  }) {
    const body = {
      matchDate: form.matchDate || null,
      facedOpponentName: form.facedOpponentName || null,
      competition: form.competition || null,
      homeAway: form.homeAway || null,
      homeScore: form.homeScore ? Number(form.homeScore) : null,
      awayScore: form.awayScore ? Number(form.awayScore) : null,
      notes: form.notes || null,
    };
    if (form.id) {
      await api.patch(`/performance-analysis/observed-matches/${form.id}`, body);
    } else {
      await api.post(`/performance-analysis/opponent-profiles/${profileId}/observed-matches`, body);
    }
    setMatchDialog(null);
    await load();
  }

  async function linkVideoToMatch(observedMatchId: string, videoSourceId: string) {
    if (!videoSourceId) return;
    await api.post(`/performance-analysis/observed-matches/${observedMatchId}/link-video`, {
      videoSourceId,
    });
    await load();
  }

  async function savePlayer(form: Partial<OpponentPlayer> & { name: string }) {
    await api.post(`/performance-analysis/opponent-profiles/${profileId}/players`, form);
    setPlayerDialog(null);
    await load();
  }

  async function saveSetPiece(form: {
    id?: string;
    kind: string;
    title?: string;
    notes?: string;
    clipId?: string;
  }) {
    await api.post(`/performance-analysis/opponent-profiles/${profileId}/set-pieces`, form);
    setSetPieceDialog(null);
    await load();
  }

  async function saveLineup() {
    await api.post(`/performance-analysis/opponent-profiles/${profileId}/lineup`, {
      formation: lineupFormation || null,
      entries: lineupEntries,
    });
    await load();
  }

  async function curateClip(clipId: string, groupKey: string) {
    await api.post(`/performance-analysis/opponent-profiles/${profileId}/curate-clip`, {
      clipId,
      groupKey,
    });
    await load();
  }

  const observedMatchesList = bundle?.observedMatches ?? [];

  if (loading || !bundle) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void openAnalysis()}>
          {sessionId ? "Continuar análise de vídeo" : "Abrir análise de vídeo"}
        </Button>
        {sessionId ? (
          <Button variant="outline" asChild>
            <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${sessionId}${querySuffix}`}>
              Workspace · {sessionStatus}
            </Link>
          </Button>
        ) : null}
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void saveProfile()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar perfil
        </Button>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border/60 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "min-h-[36px] rounded-md px-3 text-xs font-medium sm:text-sm",
              tab === t.id
                ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
                : "text-muted-foreground hover:bg-muted/60",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "context" ? (
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome do adversário</Label>
            <Input
              value={profileDraft.opponentName ?? ""}
              onChange={(e) => setProfileDraft((d) => ({ ...d, opponentName: e.target.value }))}
              className="text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input
              value={profileDraft.category ?? ""}
              onChange={(e) => setProfileDraft((d) => ({ ...d, category: e.target.value }))}
              className="text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label>Temporada</Label>
            <Input
              value={profileDraft.season ?? ""}
              onChange={(e) => setProfileDraft((d) => ({ ...d, season: e.target.value }))}
              className="text-foreground"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notas gerais</Label>
            <Textarea
              value={profileDraft.notes ?? ""}
              onChange={(e) => setProfileDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={4}
              className="text-foreground"
            />
          </div>
        </div>
      ) : null}

      {tab === "matches" ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => setMatchDialog("new")}>
              Adicionar jogo
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Confronto</TableHead>
                <TableHead>Competição</TableHead>
                <TableHead>Placar</TableHead>
                <TableHead>Vídeos</TableHead>
                <TableHead>Análise</TableHead>
                <TableHead className="w-[200px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {observedMatchesList.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.matchDate ?? "—"}</TableCell>
                  <TableCell>{m.facedOpponentName ?? "—"}</TableCell>
                  <TableCell>{m.competition ?? "—"}</TableCell>
                  <TableCell>
                    {m.homeScore != null || m.awayScore != null
                      ? `${m.homeScore ?? "—"} × ${m.awayScore ?? "—"}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.videoLinks.map((v) => v.videoSource.title).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {m.analysisStatusLabel ??
                      (m.analysisStatus
                        ? OBSERVED_MATCH_STATUS_LABEL[m.analysisStatus as keyof typeof OBSERVED_MATCH_STATUS_LABEL]
                        : "—")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {m.analysisAction && m.analysisActionLabel ? (
                        m.analysisSessionId ? (
                          <Button type="button" size="sm" variant="secondary" asChild>
                            <Link
                              href={observedMatchSessionHref(
                                m.analysisAction,
                                m.analysisSessionId,
                                m.id,
                                querySuffix,
                              )}
                            >
                              {m.analysisActionLabel}
                            </Link>
                          </Button>
                        ) : (
                          <Button type="button" size="sm" variant="secondary" onClick={() => void openAnalysis()}>
                            {m.analysisActionLabel}
                          </Button>
                        )
                      ) : null}
                      <Button type="button" size="icon" variant="ghost" onClick={() => setMatchDialog(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setDeleteMatchId(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {tab === "tactical" ? (
        <div className="grid max-w-3xl gap-4">
          {OPPONENT_TACTICAL_SECTIONS.filter((s) => s.key !== "transitionsOff" && s.key !== "transitionsDef").map(
            (sec) => (
              <div key={sec.key} className="space-y-1">
                <Label>{sec.label}</Label>
                <Textarea
                  rows={3}
                  className="text-foreground"
                  value={profileDraft[sec.key] ?? ""}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, [sec.key]: e.target.value }))}
                />
              </div>
            ),
          )}
          <div className="space-y-1">
            <Label>Transição ofensiva</Label>
            <Textarea rows={2} className="text-foreground" value={transOff} onChange={(e) => setTransOff(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Transição defensiva</Label>
            <Textarea rows={2} className="text-foreground" value={transDef} onChange={(e) => setTransDef(e.target.value)} />
          </div>
        </div>
      ) : null}

      {tab === "players" ? (
        <div className="space-y-3">
          <Button type="button" size="sm" onClick={() => setPlayerDialog("new")}>
            Adicionar jogador
          </Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Posição</TableHead>
                <TableHead>Titular?</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.players.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.shirtNumber ?? "—"}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.position ?? "—"}</TableCell>
                  <TableCell>{p.likelyStarter ? "Sim" : "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{p.tacticalRole ?? "—"}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPlayerDialog(p)}>
                      Editar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setDeletePlayerId(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {tab === "lineup" ? (
        <div className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label>Formação</Label>
            <Input
              value={lineupFormation}
              onChange={(e) => setLineupFormation(e.target.value)}
              placeholder="ex.: 4-3-3"
              className="text-foreground"
            />
          </div>
          <div
            className="relative aspect-[68/105] w-full cursor-crosshair rounded-md border border-emerald-900/60 bg-emerald-950/40"
            onPointerUp={(e) => {
              if (dragEntryIdx == null) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              setLineupEntries((entries) =>
                entries.map((en, i) =>
                  i === dragEntryIdx
                    ? { ...en, fieldX: Math.min(1, Math.max(0, x)), fieldY: Math.min(1, Math.max(0, y)) }
                    : en,
                ),
              );
              setDragEntryIdx(null);
            }}
          >
            {lineupEntries
              .filter((e) => e.fieldX != null && e.fieldY != null)
              .map((e, i) => (
                <button
                  key={`${e.name}-${i}`}
                  type="button"
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500 text-[10px] font-bold text-white shadow"
                  style={{ left: `${(e.fieldX ?? 0.5) * 100}%`, top: `${(e.fieldY ?? 0.5) * 100}%` }}
                  onPointerDown={() => setDragEntryIdx(lineupEntries.indexOf(e))}
                >
                  {e.shirtNumber ?? "?"}
                </button>
              ))}
          </div>
          <div className="space-y-2">
            <Label>Jogadores no desenho</Label>
            {lineupEntries.map((e, idx) => (
              <div key={idx} className="flex flex-wrap gap-2">
                <NativeSelectField
                  className="min-w-[140px]"
                  value={e.opponentPlayerId ?? ""}
                  onChange={(ev) => {
                    const pl = bundle.players.find((p) => p.id === ev.target.value);
                    setLineupEntries((rows) =>
                      rows.map((r, i) =>
                        i === idx
                          ? {
                              ...r,
                              opponentPlayerId: pl?.id ?? null,
                              name: pl?.name ?? r.name,
                              shirtNumber: pl?.shirtNumber ?? r.shirtNumber,
                              position: pl?.position ?? r.position,
                            }
                          : r,
                      ),
                    );
                  }}
                  placeholder="Do elenco…"
                  options={bundle.players.map((p) => ({
                    value: p.id,
                    label: `${p.shirtNumber ?? "—"} ${p.name}`,
                  }))}
                />
                <Input
                  className="w-16 text-foreground"
                  placeholder="#"
                  value={e.shirtNumber ?? ""}
                  onChange={(ev) =>
                    setLineupEntries((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, shirtNumber: Number(ev.target.value) || null } : r)),
                    )
                  }
                />
                <Input
                  className="flex-1 min-w-[120px] text-foreground"
                  value={e.name}
                  onChange={(ev) =>
                    setLineupEntries((rows) =>
                      rows.map((r, i) => (i === idx ? { ...r, name: ev.target.value } : r)),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setLineupEntries((rows) => [
                  ...rows,
                  { name: "Jogador", isStarter: true, fieldX: 0.5, fieldY: 0.5, sortOrder: rows.length },
                ])
              }
            >
              Linha
            </Button>
          </div>
          <Button type="button" onClick={() => void saveLineup()}>
            Salvar escalação provável
          </Button>
        </div>
      ) : null}

      {tab === "setpieces" ? (
        <div className="space-y-3">
          <Button type="button" size="sm" onClick={() => setSetPieceDialog("new")}>
            Nova bola parada
          </Button>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Clip</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bundle.setPieces.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell>
                    {OPPONENT_SET_PIECE_KINDS.find((k) => k.key === sp.kind)?.label ?? sp.kind}
                  </TableCell>
                  <TableCell>{sp.title ?? "—"}</TableCell>
                  <TableCell>
                    {sp.clipId ? (
                      <button type="button" className="text-violet-300 underline" onClick={() => setPreviewClipId(sp.clipId)}>
                        Ver clip
                      </button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSetPieceDialog(sp)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {tab === "clips" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Clips da sessão</h3>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {bundle.sessionClips.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 rounded border border-border/40 px-2 py-1">
                  <span className="flex-1">{c.title}</span>
                  <NativeSelectField
                    className="w-[160px]"
                    value=""
                    onChange={(e) => void curateClip(c.id, e.target.value)}
                    placeholder="Curar em…"
                    options={OPPONENT_CLIP_GROUPS.map((g) => ({ value: g.key, label: g.label }))}
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setPreviewClipId(c.id)}>
                    Preview
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Coleção curada</h3>
            {bundle.clipCollection ? (
              <div className="space-y-3">
                <Input
                  defaultValue={bundle.clipCollection.title}
                  className="text-foreground"
                  onBlur={(e) =>
                    void api.patch(`/performance-analysis/clip-collections/${bundle.clipCollection!.id}`, {
                      title: e.target.value,
                    })
                  }
                />
                {OPPONENT_CLIP_GROUPS.map((g) => {
                  const items = bundle.clipCollection!.items.filter(
                    (i) => i.groupKey === g.key,
                  ) as ClipCollectionItemRow[];
                  return (
                    <ClipCollectionReorderList
                      key={g.key}
                      collectionId={bundle.clipCollection!.id}
                      groupKey={g.key}
                      groupLabel={g.label}
                      items={items}
                      onChanged={load}
                      onPreview={(clipId) => setPreviewClipId(clipId)}
                      onRemove={(itemId) =>
                        void api.delete(`/performance-analysis/clip-collection-items/${itemId}`).then(load)
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Abra a análise de vídeo para criar a coleção.</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "evidence" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tempo</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Jogador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bundle.sessionEvents.slice(0, 50).map((ev) => (
              <TableRow key={ev.id}>
                <TableCell>{Math.floor(ev.startMs / 1000)}s</TableCell>
                <TableCell>{ev.tagDefinition?.label ?? "—"}</TableCell>
                <TableCell>{ev.opponentPlayer?.name ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <ObservedMatchDialog
        open={matchDialog !== null}
        initial={matchDialog === "new" ? null : matchDialog}
        videoOptions={bundle.sessionVideoSources}
        onClose={() => setMatchDialog(null)}
        onSave={saveObservedMatch}
        onLinkVideo={linkVideoToMatch}
      />

      <PlayerDialog
        open={playerDialog !== null}
        initial={playerDialog === "new" ? null : playerDialog}
        onClose={() => setPlayerDialog(null)}
        onSave={savePlayer}
      />

      <SetPieceDialog
        open={setPieceDialog !== null}
        initial={setPieceDialog === "new" ? null : setPieceDialog}
        clipOptions={bundle.sessionClips}
        onClose={() => setSetPieceDialog(null)}
        onSave={saveSetPiece}
      />

      <Dialog open={!!previewClipId} onOpenChange={() => setPreviewClipId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview do clip</DialogTitle>
          </DialogHeader>
          {previewClipId ? <AnalysisPrivateClipPlayer clipId={previewClipId} /> : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteMatchId} onOpenChange={() => setDeleteMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover jogo observado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void api.delete(`/performance-analysis/observed-matches/${deleteMatchId}`).then(() => {
                  setDeleteMatchId(null);
                  void load();
                })
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePlayerId} onOpenChange={() => setDeletePlayerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover jogador?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                void api.delete(`/performance-analysis/opponent-players/${deletePlayerId}`).then(() => {
                  setDeletePlayerId(null);
                  void load();
                })
              }
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}

function ObservedMatchDialog({
  open,
  initial,
  videoOptions,
  onClose,
  onSave,
  onLinkVideo,
}: {
  open: boolean;
  initial: ObservedMatch | null;
  videoOptions: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSave: (f: {
    id?: string;
    matchDate?: string;
    facedOpponentName?: string;
    competition?: string;
    homeAway?: string;
    homeScore?: string;
    awayScore?: string;
    notes?: string;
  }) => Promise<void>;
  onLinkVideo: (matchId: string, videoId: string) => Promise<void>;
}) {
  const [form, setForm] = useState({
    matchDate: "",
    facedOpponentName: "",
    competition: "",
    homeAway: "",
    homeScore: "",
    awayScore: "",
    notes: "",
  });
  const [videoId, setVideoId] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      matchDate: initial?.matchDate ?? "",
      facedOpponentName: initial?.facedOpponentName ?? "",
      competition: initial?.competition ?? "",
      homeAway: initial?.homeAway ?? "",
      homeScore: initial?.homeScore != null ? String(initial.homeScore) : "",
      awayScore: initial?.awayScore != null ? String(initial.awayScore) : "",
      notes: initial?.notes ?? "",
    });
    setVideoId("");
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar jogo observado" : "Novo jogo observado"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input type="date" className="text-foreground" value={form.matchDate} onChange={(e) => setForm({ ...form, matchDate: e.target.value })} />
          <Input placeholder="Adversário enfrentado" className="text-foreground" value={form.facedOpponentName} onChange={(e) => setForm({ ...form, facedOpponentName: e.target.value })} />
          <Input placeholder="Competição" className="text-foreground" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} />
          <NativeSelectField
            value={form.homeAway}
            onChange={(e) => setForm({ ...form, homeAway: e.target.value })}
            placeholder="Mando…"
            options={[
              { value: "home", label: "Casa" },
              { value: "away", label: "Fora" },
              { value: "neutral", label: "Neutro" },
            ]}
          />
          <div className="flex gap-2">
            <Input placeholder="Gols casa" className="text-foreground" value={form.homeScore} onChange={(e) => setForm({ ...form, homeScore: e.target.value })} />
            <Input placeholder="Gols visitante" className="text-foreground" value={form.awayScore} onChange={(e) => setForm({ ...form, awayScore: e.target.value })} />
          </div>
          <Textarea rows={3} className="text-foreground" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {initial ? (
            <NativeSelectField
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="Associar vídeo…"
              options={videoOptions.map((v) => ({ value: v.id, label: v.title }))}
            />
          ) : null}
        </div>
        <DialogFooter>
          {initial && videoId ? (
            <Button type="button" variant="secondary" onClick={() => void onLinkVideo(initial.id, videoId)}>
              Associar vídeo
            </Button>
          ) : null}
          <Button type="button" onClick={() => void onSave({ ...form, id: initial?.id })}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlayerDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: OpponentPlayer | null;
  onClose: () => void;
  onSave: (p: Partial<OpponentPlayer> & { name: string }) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<OpponentPlayer> & { name: string }>({ name: "" });
  useEffect(() => {
    if (!open) return;
    setForm(
      initial ?? {
        name: "",
        shirtNumber: null,
        position: "",
        likelyStarter: false,
        tacticalRole: "",
        strengths: "",
        weaknesses: "",
        observations: "",
      },
    );
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar jogador" : "Novo jogador"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Input className="text-foreground" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input className="text-foreground" placeholder="Número" type="number" value={form.shirtNumber ?? ""} onChange={(e) => setForm({ ...form, shirtNumber: Number(e.target.value) || null })} />
          <Input className="text-foreground" placeholder="Posição" value={form.position ?? ""} onChange={(e) => setForm({ ...form, position: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.likelyStarter ?? false} onChange={(e) => setForm({ ...form, likelyStarter: e.target.checked })} />
            Provável titular
          </label>
          <Input className="text-foreground" placeholder="Papel tático" value={form.tacticalRole ?? ""} onChange={(e) => setForm({ ...form, tacticalRole: e.target.value })} />
          <Textarea className="text-foreground" placeholder="Pontos fortes" value={form.strengths ?? ""} onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
          <Textarea className="text-foreground" placeholder="Pontos fracos" value={form.weaknesses ?? ""} onChange={(e) => setForm({ ...form, weaknesses: e.target.value })} />
          <Textarea className="text-foreground" placeholder="Observações" value={form.observations ?? ""} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="button" disabled={!form.name.trim()} onClick={() => void onSave({ ...form, id: initial?.id })}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetPieceDialog({
  open,
  initial,
  clipOptions,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: { id: string; kind: string; title: string | null; notes: string | null; clipId: string | null } | null;
  clipOptions: Array<{ id: string; title: string }>;
  onClose: () => void;
  onSave: (f: { id?: string; kind: string; title?: string; notes?: string; clipId?: string }) => Promise<void>;
}) {
  const [kind, setKind] = useState("attacking_corner");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [clipId, setClipId] = useState("");
  useEffect(() => {
    if (!open) return;
    setKind(initial?.kind ?? "attacking_corner");
    setTitle(initial?.title ?? "");
    setNotes(initial?.notes ?? "");
    setClipId(initial?.clipId ?? "");
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar bola parada" : "Nova bola parada"}</DialogTitle>
        </DialogHeader>
        <NativeSelectField
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={OPPONENT_SET_PIECE_KINDS.map((k) => ({ value: k.key, label: k.label }))}
        />
        <Input className="text-foreground" placeholder="Título / padrão" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea className="text-foreground" placeholder="Descrição" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        <NativeSelectField
          value={clipId}
          onChange={(e) => setClipId(e.target.value)}
          placeholder="Clip de evidência…"
          options={clipOptions.map((c) => ({ value: c.id, label: c.title }))}
        />
        <DialogFooter>
          <Button
            type="button"
            onClick={() =>
              void onSave({
                id: initial?.id,
                kind,
                title,
                notes,
                clipId: clipId || undefined,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

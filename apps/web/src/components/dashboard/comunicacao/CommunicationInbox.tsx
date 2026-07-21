"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Send,
  Star,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  DashboardDeptSection,
  DashboardDeptSearch,
  DashboardDialogBody,
  DashboardDialogFooter,
  DashboardEmptyState,
  DashboardFieldLabel,
  DashboardFilterBox,
  DashboardFormSection,
  DashboardLoadingState,
  DashboardStatGrid,
} from "@/components/dashboard/DashboardDeptHeader";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  type CommunicationConversationDetail,
  type CommunicationConversationListItem,
  type CommunicationStats,
} from "./types";
import { NativeSelect, nativeSelectClassName } from "@/components/ui/native-select";

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function CommunicationInbox() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [status, setStatus] = useState<string>("");
  const [channelType, setChannelType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [stats, setStats] = useState<CommunicationStats | null>(null);
  const [rows, setRows] = useState<CommunicationConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CommunicationConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    subject: "",
    initialMessage: "",
  });
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const selectedTenantName = useMemo(
    () => tenants.find((t) => t.id === tenantId)?.name,
    [tenants, tenantId],
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (status) params.set("status", status);
      if (channelType) params.set("channelType", channelType);
      if (search.trim()) params.set("search", search.trim());
      if (unreadOnly) params.set("unreadOnly", "1");
      if (favoritesOnly) params.set("favoritesOnly", "1");
      const qs = params.toString();
      const [listRes, statsRes] = await Promise.all([
        api.get<CommunicationConversationListItem[]>(
          `/comunicacao/conversations${qs ? `?${qs}` : ""}`,
        ),
        api.get<CommunicationStats>(
          `/comunicacao/stats${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`,
        ),
      ]);
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setStats(statsRes.data ?? null);
    } catch {
      setRows([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, status, channelType, search, unreadOnly, favoritesOnly]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get<CommunicationConversationDetail>(
        `/comunicacao/conversations/${id}`,
      );
      setDetail(data);
      if (data.unreadCount > 0) {
        await api.post(`/comunicacao/conversations/${id}/read`);
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, unreadCount: 0 } : r)),
        );
      }
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const handleSend = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/comunicacao/conversations/${selectedId}/messages`, {
        body: reply.trim(),
      });
      setReply("");
      await loadDetail(selectedId);
      await loadList();
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível enviar a mensagem." });
    } finally {
      setSending(false);
    }
  };

  const handleNote = async () => {
    if (!selectedId || !note.trim()) return;
    setSending(true);
    try {
      await api.post(`/comunicacao/conversations/${selectedId}/notes`, {
        body: note.trim(),
      });
      setNote("");
      await loadDetail(selectedId);
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível salvar a nota." });
    } finally {
      setSending(false);
    }
  };

  const handleStatus = async (next: string) => {
    if (!selectedId) return;
    try {
      await api.patch(`/comunicacao/conversations/${selectedId}`, { status: next });
      await loadDetail(selectedId);
      await loadList();
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível atualizar o status." });
    }
  };

  const handleFavorite = async () => {
    if (!selectedId || !detail) return;
    try {
      await api.patch(`/comunicacao/conversations/${selectedId}`, {
        isFavorite: !detail.isFavorite,
      });
      await loadDetail(selectedId);
      await loadList();
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível atualizar favorito." });
    }
  };

  const handleCreate = async () => {
    if (!tenantId) {
      setFeedback({ type: "err", msg: "Selecione a unidade (empresa/clube) antes de criar." });
      return;
    }
    if (!newForm.contactPhone.trim() && !newForm.contactEmail.trim()) {
      setFeedback({ type: "err", msg: "Informe telefone ou e-mail do contato." });
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post<CommunicationConversationDetail>(
        "/comunicacao/conversations",
        {
          tenantId,
          channelType: "whatsapp",
          ...newForm,
        },
      );
      setNewOpen(false);
      setNewForm({
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        subject: "",
        initialMessage: "",
      });
      setFeedback({ type: "ok", msg: "Conversa criada." });
      await loadList();
      setSelectedId(data.id);
    } catch {
      setFeedback({ type: "err", msg: "Não foi possível criar a conversa." });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <DashboardStatGrid
        items={[
          { value: stats?.open ?? 0, label: "Abertas", tone: "sky" },
          { value: stats?.pending ?? 0, label: "Pendentes", tone: "amber" },
          { value: stats?.unread ?? 0, label: "Não lidas", tone: "rose" },
          { value: stats?.favorites ?? 0, label: "Favoritas", tone: "violet" },
        ]}
      />

      <DashboardDeptSection
        title="Filtros"
        aside={
          <Button
            type="button"
            className="min-h-[44px]"
            onClick={() => setNewOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova conversa
          </Button>
        }
      >
        <DashboardFilterBox accent="sky" className="sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <DashboardFieldLabel>Unidade</DashboardFieldLabel>
            <NativeSelect
              value={tenantId || "__all__"}
              onChange={(e) => setTenantId(e.target.value === "__all__" ? "" : e.target.value)}
            >
              <option value="__all__">Todas</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <DashboardFieldLabel>Status</DashboardFieldLabel>
            <NativeSelect
              value={status || "__all__"}
              onChange={(e) => setStatus(e.target.value === "__all__" ? "" : e.target.value)}
            >
              <option value="__all__">Todos</option>
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <DashboardFieldLabel>Canal</DashboardFieldLabel>
            <NativeSelect
              value={channelType || "__all__"}
              onChange={(e) => setChannelType(e.target.value === "__all__" ? "" : e.target.value)}
            >
              <option value="__all__">Todos</option>
              {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <DashboardFieldLabel>Busca</DashboardFieldLabel>
            <DashboardDeptSearch
              value={search}
              onChange={setSearch}
              placeholder="Nome, telefone, assunto…"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <Button
              type="button"
              variant={unreadOnly ? "default" : "outline"}
              className="min-h-[44px]"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              Não lidas
            </Button>
            <Button
              type="button"
              variant={favoritesOnly ? "default" : "outline"}
              className="min-h-[44px]"
              onClick={() => setFavoritesOnly((v) => !v)}
            >
              Favoritas
            </Button>
            <Button type="button" variant="secondary" className="min-h-[44px]" onClick={() => void loadList()}>
              Atualizar
            </Button>
          </div>
        </DashboardFilterBox>
      </DashboardDeptSection>

      <div className="mt-4 grid min-h-[min(70vh,720px)] gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card">
          <div className="border-b border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground">
            Conversas ({rows.length})
          </div>
          {loading ? (
            <DashboardLoadingState />
          ) : rows.length === 0 ? (
            <DashboardEmptyState>
              Nenhuma conversa. Crie uma ou aguarde mensagens do WhatsApp Cloud API.
            </DashboardEmptyState>
          ) : (
            <ul className="max-h-[min(65vh,680px)] divide-y divide-border/50 overflow-y-auto">
              {rows.map((row) => {
                const active = row.id === selectedId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={cn(
                        "flex w-full min-h-[64px] flex-col gap-0.5 px-3 py-3 text-left transition-colors",
                        active ? "bg-sky-500/10" : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-foreground">
                          {row.contactName || row.contactPhone || row.contactEmail || "Sem contato"}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatWhen(row.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{CHANNEL_LABELS[row.channelType] ?? row.channelType}</span>
                        <span>·</span>
                        <span>{STATUS_LABELS[row.status] ?? row.status}</span>
                        {row.unreadCount > 0 && (
                          <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-300">
                            {row.unreadCount}
                          </span>
                        )}
                        {row.isFavorite && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </div>
                      <p className="truncate text-xs text-muted-foreground/90">
                        {row.lastMessagePreview || "—"}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex min-h-[320px] flex-col overflow-hidden rounded-xl border border-border/80 bg-card">
          {!selectedId ? (
            <DashboardEmptyState>
              Selecione uma conversa — timeline, CRM e resposta ficam neste painel.
            </DashboardEmptyState>
          ) : loadingDetail || !detail ? (
            <DashboardLoadingState />
          ) : (
            <>
              <div className="flex flex-col gap-2 border-b border-border/60 px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-foreground">
                    {detail.contactName || selectedRow?.contactName || "Conversa"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {[detail.contactPhone, detail.contactEmail].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>{CHANNEL_LABELS[detail.channelType] ?? detail.channelType}</span>
                    {detail.customer && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                        Cliente: {detail.customer.name}
                      </span>
                    )}
                    {detail.venuePipelineLead && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-800 dark:text-amber-200">
                        Lead Hall: {detail.venuePipelineLead.contactName}
                      </span>
                    )}
                    {detail.tenant && <span>{detail.tenant.name}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => void handleFavorite()}
                  >
                    <Star
                      className={cn(
                        "mr-1 h-4 w-4",
                        detail.isFavorite && "fill-amber-400 text-amber-400",
                      )}
                    />
                    Favorito
                  </Button>
                  <NativeSelect
                    className={nativeSelectClassName("w-[140px]")}
                    value={detail.status}
                    onChange={(e) => void handleStatus(e.target.value)}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {detail.messages.map((m) => {
                  const outbound = m.direction === "outbound";
                  return (
                    <div
                      key={m.id}
                      className={cn("flex", outbound ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          outbound
                            ? "bg-sky-600 text-white"
                            : "bg-muted text-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body || "[mídia]"}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            outbound ? "text-sky-100/80" : "text-muted-foreground",
                          )}
                        >
                          {m.sentByName ? `${m.sentByName} · ` : ""}
                          {formatWhen(m.createdAt)}
                          {m.deliveryStatus ? ` · ${m.deliveryStatus}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {detail.notes.length > 0 && (
                  <div className="space-y-2 border-t border-border/50 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Notas internas
                    </p>
                    {detail.notes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
                      >
                        <p className="whitespace-pre-wrap">{n.body}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {n.createdByName || "Equipe"} · {formatWhen(n.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {detail.activities.length > 0 && (
                  <div className="space-y-1 border-t border-border/50 pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Timeline
                    </p>
                    {detail.activities.slice(0, 12).map((a) => (
                      <p key={a.id} className="text-xs text-muted-foreground">
                        {formatWhen(a.createdAt)} — {a.summary}
                        {a.actorName ? ` (${a.actorName})` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-border/60 p-3">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Responder…"
                  className="min-h-[72px] resize-none text-foreground"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="min-h-[44px] flex-1"
                    disabled={sending || !reply.trim()}
                    onClick={() => void handleSend()}
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nota interna…"
                    className="min-h-[44px] text-foreground"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] shrink-0"
                    disabled={sending || !note.trim()}
                    onClick={() => void handleNote()}
                  >
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova conversa</DialogTitle>
          </DialogHeader>
          <DashboardDialogBody>
            <DashboardFormSection title="Contato">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Empresa / clube</Label>
                  {tenantId ? (
                    <>
                      <p className="min-h-[44px] rounded-md border border-input bg-muted/30 px-3 py-2.5 text-sm text-foreground">
                        {selectedTenantName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Usando a unidade do filtro da inbox.
                      </p>
                    </>
                  ) : (
                    <NativeSelect
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </NativeSelect>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    value={newForm.contactName}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, contactName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    placeholder="5511999999999"
                    value={newForm.contactPhone}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, contactPhone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    className="min-h-[44px] text-foreground"
                    value={newForm.contactEmail}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, contactEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Assunto</Label>
                  <Input
                    className="min-h-[44px] text-foreground"
                    value={newForm.subject}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, subject: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Primeira mensagem (opcional)</Label>
                  <Textarea
                    className="min-h-[80px] text-foreground"
                    value={newForm.initialMessage}
                    onChange={(e) =>
                      setNewForm((f) => ({ ...f, initialMessage: e.target.value }))
                    }
                  />
                </div>
              </div>
            </DashboardFormSection>
          </DashboardDialogBody>
          <DashboardDialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={sending} onClick={() => void handleCreate()}>
              Criar
            </Button>
          </DashboardDialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
        variant={feedback?.type === "ok" ? "success" : "error"}
        title={feedback?.type === "ok" ? "Pronto" : "Erro"}
        message={feedback?.msg ?? ""}
      />
    </>
  );
}

import { api } from "@/lib/api";
import {
  type ImmutableQueuedEvent,
  type QueueItemStatus,
  freezePayload,
  newClientEventKey,
  nextQueueSequence,
  resolveFlushSessionId,
  sortQueueForFlush,
} from "@/lib/analysis-event-queue.logic";

export type QueuedAnalysisEvent = ImmutableQueuedEvent;

type Listener = () => void;

type EnqueueInput = {
  tenantId: string;
  sessionId: string;
  payload: Record<string, unknown>;
  clientEventKey?: string;
  capturedAtMs?: number;
};

export class AnalysisEventQueue {
  private queue: ImmutableQueuedEvent[] = [];
  private listeners = new Set<Listener>();
  private flushing = false;
  /** Sessão ativa na UI — só para flush periódico; não define destino do POST. */
  private activeUiSessionId: string | null = null;
  private activeTenantId: string | null = null;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  getSnapshot(): ImmutableQueuedEvent[] {
    return this.queue.map((q) => ({ ...q, payloadSnapshot: { ...q.payloadSnapshot } }));
  }

  getForSession(sessionId: string): ImmutableQueuedEvent[] {
    return this.getSnapshot().filter((q) => q.sessionId === sessionId);
  }

  enqueue(input: EnqueueInput): string {
    const clientEventKey = input.clientEventKey?.trim() || newClientEventKey();
    const capturedAtMs = input.capturedAtMs ?? Date.now();
    const payloadSnapshot = freezePayload(input.tenantId, input.sessionId, input.payload, clientEventKey);
    const item: ImmutableQueuedEvent = {
      sequence: nextQueueSequence(this.queue),
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      clientEventKey,
      capturedAtMs,
      payloadSnapshot,
      status: "pending",
    };
    this.queue.push(item);
    this.notify();
    void this.flush();
    return clientEventKey;
  }

  /** Atualiza snapshot local (ex.: completar zona/jogador) sem alterar startMs capturado. */
  patchPayload(clientEventKey: string, patch: Record<string, unknown>) {
    const item = this.queue.find((q) => q.clientEventKey === clientEventKey);
    if (!item || item.status === "synced") return;
    item.payloadSnapshot = { ...item.payloadSnapshot, ...patch };
    this.notify();
    if (item.status === "failed") {
      item.status = "pending";
      void this.flush();
    }
  }

  retry(clientEventKey: string) {
    const item = this.queue.find((q) => q.clientEventKey === clientEventKey);
    if (!item || item.status === "synced") return;
    item.status = "pending";
    item.error = undefined;
    this.notify();
    void this.flush();
  }

  /** Remove pendente/falha da fila; synced exige undo via API. */
  removeLocal(clientEventKey: string): boolean {
    const idx = this.queue.findIndex((q) => q.clientEventKey === clientEventKey);
    if (idx < 0) return false;
    const item = this.queue[idx];
    if (item.status === "synced") return false;
    this.queue.splice(idx, 1);
    this.notify();
    return true;
  }

  async undoQueuedOrSynced(sessionId: string): Promise<"local" | "server" | "none"> {
    const sessionItems = this.queue.filter((q) => q.sessionId === sessionId);
    const lastPending = [...sessionItems]
      .reverse()
      .find((q) => q.status === "pending" || q.status === "failed" || q.status === "syncing");
    if (lastPending && lastPending.status !== "synced") {
      this.removeLocal(lastPending.clientEventKey);
      return "local";
    }
    const lastSynced = [...sessionItems].reverse().find((q) => q.status === "synced" && q.serverEventId);
    if (lastSynced?.serverEventId) {
      try {
        await api.delete(`/performance-analysis/events/${lastSynced.serverEventId}`);
        this.queue = this.queue.filter((q) => q.clientEventKey !== lastSynced.clientEventKey);
        this.notify();
        return "server";
      } catch {
        return "none";
      }
    }
    return "none";
  }

  async flush() {
    if (this.flushing) return;
    const pending = sortQueueForFlush(this.queue);
    if (pending.length === 0) return;
    this.flushing = true;
    try {
      for (const item of pending) {
        if (item.status === "synced") continue;
        const postSessionId = resolveFlushSessionId(item, this.activeUiSessionId);
        if (item.tenantId !== this.activeTenantId && this.activeTenantId) {
          // multi-tenant: ainda envia com sessionId correto do item
        }
        item.status = "syncing";
        this.notify();
        const body = { ...item.payloadSnapshot };
        delete body._queueTenantId;
        delete body._queueSessionId;
        try {
          const { data } = await api.post<{ id: string }>(
            `/performance-analysis/sessions/${postSessionId}/events`,
            body,
          );
          item.status = "synced";
          item.serverEventId = data.id;
          item.error = undefined;
        } catch (err) {
          item.status = "failed";
          item.error = err instanceof Error ? err.message : "Falha ao sincronizar";
        }
        this.notify();
      }
    } finally {
      this.flushing = false;
    }
  }

  bindSession(sessionId: string, tenantId: string) {
    this.activeUiSessionId = sessionId;
    this.activeTenantId = tenantId;
    const run = () => void this.flush();
    run();
    const id = window.setInterval(run, 8000);
    return () => {
      window.clearInterval(id);
      if (this.activeUiSessionId === sessionId) {
        this.activeUiSessionId = null;
      }
    };
  }
}

export const analysisEventQueue = new AnalysisEventQueue();

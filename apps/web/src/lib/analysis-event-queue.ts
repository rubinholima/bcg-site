import { api } from "@/lib/api";

export type QueuedAnalysisEvent = {
  clientEventKey: string;
  payload: Record<string, unknown>;
  status: "pending" | "syncing" | "failed" | "synced";
  error?: string;
  serverEventId?: string;
};

type Listener = () => void;

export class AnalysisEventQueue {
  private queue: QueuedAnalysisEvent[] = [];
  private listeners = new Set<Listener>();
  private flushing = false;
  private sessionId: string | null = null;

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  getSnapshot() {
    return [...this.queue];
  }

  enqueue(payload: Record<string, unknown>) {
    const clientEventKey =
      (typeof payload.clientEventKey === "string" && payload.clientEventKey) ||
      `live-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const item: QueuedAnalysisEvent = {
      clientEventKey,
      payload: { ...payload, clientEventKey, source: "LIVE" },
      status: "pending",
    };
    this.queue.unshift(item);
    this.notify();
    void this.flush();
    return clientEventKey;
  }

  retry(clientEventKey: string) {
    const item = this.queue.find((q) => q.clientEventKey === clientEventKey);
    if (!item || item.status === "synced") return;
    item.status = "pending";
    item.error = undefined;
    this.notify();
    void this.flush();
  }

  async flush() {
    if (this.flushing || !this.sessionId) return;
    const sid = this.sessionId;
    this.flushing = true;
    try {
      const pending = this.queue.filter((q) => q.status === "pending" || q.status === "failed");
      for (const item of pending) {
        if (item.status === "synced") continue;
        item.status = "syncing";
        this.notify();
        try {
          const { data } = await api.post<{ id: string }>(
            `/performance-analysis/sessions/${sid}/events`,
            item.payload,
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

  bindSession(sessionId: string) {
    this.sessionId = sessionId;
    const run = () => void this.flush();
    run();
    const id = window.setInterval(run, 8000);
    return () => {
      window.clearInterval(id);
      if (this.sessionId === sessionId) this.sessionId = null;
    };
  }
}

export const analysisEventQueue = new AnalysisEventQueue();

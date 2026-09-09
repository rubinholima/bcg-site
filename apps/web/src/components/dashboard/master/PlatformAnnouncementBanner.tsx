"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import type { AnnouncementType, UserAnnouncement } from "@/lib/master-ops-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<
  AnnouncementType,
  { icon: typeof Info; className: string }
> = {
  info: { icon: Info, className: "border-sky-500/30 bg-sky-500/10 text-sky-100" },
  warning: { icon: AlertTriangle, className: "border-amber-500/30 bg-amber-500/10 text-amber-100" },
  success: { icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100" },
  danger: { icon: XCircle, className: "border-red-500/30 bg-red-500/10 text-red-100" },
};

export function PlatformAnnouncementBanner() {
  const { canAccessDashboard, loading } = useAuth();
  const [items, setItems] = useState<UserAnnouncement[]>([]);

  const load = useCallback(async () => {
    const res = await authFetch("/api/me/announcements");
    if (!res.ok) return;
    setItems((await res.json()) as UserAnnouncement[]);
  }, []);

  useEffect(() => {
    if (loading || !canAccessDashboard) return;
    void load();
  }, [loading, canAccessDashboard, load]);

  const handleDismiss = async (id: string, dismissible: boolean) => {
    if (!dismissible) {
      await authFetch(`/api/me/announcements/${id}/read`, { method: "POST" });
      setItems((prev) => prev.filter((a) => a.id !== id));
      return;
    }
    await authFetch(`/api/me/announcements/${id}/dismiss`, { method: "POST" });
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  if (!items.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {items.map((item) => {
        const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={item.id}
            className={cn(
              "flex gap-3 rounded-xl border px-3 py-3 sm:px-4",
              style.className,
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{item.message}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={item.dismissible ? "Dispensar aviso" : "Marcar como lido"}
              onClick={() => void handleDismiss(item.id, item.dismissible)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

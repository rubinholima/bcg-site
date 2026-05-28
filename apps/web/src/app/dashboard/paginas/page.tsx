"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PaginasHub } from "@/components/dashboard/page-builder/PaginasHub";
import type { Page } from "@/types/page";
import type { Tenant } from "@/types/tenant";

interface EventItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  content?: { blocks?: unknown[] };
}

export default function PaginasPage() {
  const { canAccessModule } = useAuth();
  const [pages, setPages] = useState<Page[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccessEventos = canAccessModule("eventos");

  useEffect(() => {
    let cancelled = false;
    const fetches: Promise<unknown>[] = [
      fetch("/api/pages", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/tenants", { credentials: "include" }).then((r) => (r.ok ? r.json() : [])),
    ];
    if (canAccessEventos) {
      fetches.push(api.get<EventItem[]>("/events").then((r) => (Array.isArray(r.data) ? r.data : [])));
    }
    Promise.all(fetches)
      .then((results) => {
        if (cancelled) return;
        setPages(Array.isArray(results[0]) ? results[0] : []);
        setTenants(Array.isArray(results[1]) ? results[1] : []);
        if (canAccessEventos && results[2] !== undefined) {
          setEvents(Array.isArray(results[2]) ? (results[2] as EventItem[]) : []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao carregar páginas.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canAccessEventos]);

  return (
    <PaginasHub
      pages={pages}
      tenants={tenants}
      events={events}
      canAccessEventos={canAccessEventos}
      loading={loading}
      error={error}
      onError={setError}
      onPagesChange={setPages}
    />
  );
}

"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import type { Group } from "@/types/group";

/**
 * Atualiza título da página e favicon com os dados do grupo (nome + logo).
 * Usado dentro do dashboard.
 */
export function DashboardHead() {
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/group")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Group | null) => {
        if (!cancelled && data) setGroup(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const name = group?.name ?? "Boston City Group";
    const title = `Dashboard · ${name}`;
    if (document.title !== title) {
      document.title = title;
    }
  }, [group?.name]);

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dashboard-favicon]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-dashboard-favicon", "true");
      document.head.appendChild(link);
    }
    link.href = "/bcg-logo.png";
    return () => {
      const el = document.querySelector('link[rel="icon"][data-dashboard-favicon]');
      if (el) el.remove();
    };
  }, []);

  return null;
}

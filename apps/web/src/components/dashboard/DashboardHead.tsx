"use client";

import { useState, useEffect } from "react";
import type { Group } from "@/types/group";

/**
 * Atualiza título da página e favicon com os dados do grupo (nome + logo).
 * Usado dentro do dashboard.
 */
export function DashboardHead() {
  const [group, setGroup] = useState<Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(`${baseUrl}/group`)
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
    const title = name ? `Dashboard - BCG | ${name}` : "Dashboard - BCG";
    if (document.title !== title) {
      document.title = title;
    }
  }, [group?.name]);

  useEffect(() => {
    if (!group?.logoUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"][data-dashboard-favicon]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      link.setAttribute("data-dashboard-favicon", "true");
      document.head.appendChild(link);
    }
    if (link.href !== group.logoUrl) {
      link.href = group.logoUrl;
    }
    return () => {
      const el = document.querySelector('link[rel="icon"][data-dashboard-favicon]');
      if (el) el.remove();
    };
  }, [group?.logoUrl]);

  return null;
}

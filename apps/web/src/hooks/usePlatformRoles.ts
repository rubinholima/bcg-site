"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import type { PlatformRole } from "@/lib/platform-roles";

export function usePlatformRoles(includeInactive = false) {
  const [roles, setRoles] = useState<PlatformRole[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = includeInactive ? "?includeInactive=1" : "";
      const res = await authFetch(`/api/settings/roles${qs}`);
      if (!res.ok) return;
      const data = (await res.json()) as { roles?: PlatformRole[] };
      setRoles(data.roles ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  return { roles, loading, reload: load };
}

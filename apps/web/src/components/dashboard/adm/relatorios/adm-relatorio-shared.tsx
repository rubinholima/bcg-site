"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface AdmRelatorioTenant {
  id: string;
  name: string;
}

export function useAdmRelatorioTenants() {
  const [tenants, setTenants] = useState<AdmRelatorioTenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<AdmRelatorioTenant[]>("/tenants")
      .then(({ data }) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, []);

  return { tenants, loading };
}

"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface LogisticaLookupOption {
  id: string;
  name: string;
  code?: string | null;
  capacity?: number;
  transportCompanyId?: string | null;
  expenseCategoryId?: string | null;
  categoryId?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

interface LookupsState {
  hotels: LogisticaLookupOption[];
  transportCompanies: LogisticaLookupOption[];
  usageMoments: LogisticaLookupOption[];
  loyaltyPrograms: LogisticaLookupOption[];
  paymentTypes: LogisticaLookupOption[];
  roomTypes: LogisticaLookupOption[];
  airports: LogisticaLookupOption[];
  destinations: LogisticaLookupOption[];
  pointsOfInterest: LogisticaLookupOption[];
  suppliers: LogisticaLookupOption[];
  expenseCategories: LogisticaLookupOption[];
  serviceProducts: LogisticaLookupOption[];
  visaTypes: LogisticaLookupOption[];
  loading: boolean;
}

const EMPTY: LookupsState = {
  hotels: [],
  transportCompanies: [],
  usageMoments: [],
  loyaltyPrograms: [],
  paymentTypes: [],
  roomTypes: [],
  airports: [],
  destinations: [],
  pointsOfInterest: [],
  suppliers: [],
  expenseCategories: [],
  serviceProducts: [],
  visaTypes: [],
  loading: true,
};

async function fetchList(path: string): Promise<LogisticaLookupOption[]> {
  try {
    const { data } = await api.get<LogisticaLookupOption[]>(
      `/logistica-cadastros/${path}?activeOnly=true`,
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function useLogisticaCadastrosLookups(tenantId?: string): LookupsState {
  const [state, setState] = useState<LookupsState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    const suppliersPromise = tenantId
      ? api
          .get<LogisticaLookupOption[]>(
            `/compras/suppliers?tenantId=${encodeURIComponent(tenantId)}`,
          )
          .then(({ data }) => (Array.isArray(data) ? data : []))
          .catch(() => [] as LogisticaLookupOption[])
      : Promise.resolve([] as LogisticaLookupOption[]);

    Promise.all([
      fetchList("hotels"),
      fetchList("transport-companies"),
      fetchList("usage-moments"),
      fetchList("loyalty-programs"),
      fetchList("payment-types"),
      fetchList("room-types"),
      fetchList("airports"),
      fetchList("destinations"),
      fetchList("points-of-interest"),
      suppliersPromise,
      fetchList("expense-categories"),
      fetchList("service-products"),
      fetchList("visa-types"),
    ]).then(
      ([
        hotels,
        transportCompanies,
        usageMoments,
        loyaltyPrograms,
        paymentTypes,
        roomTypes,
        airports,
        destinations,
        pointsOfInterest,
        suppliers,
        expenseCategories,
        serviceProducts,
        visaTypes,
      ]) => {
        if (cancelled) return;
        setState({
          hotels,
          transportCompanies,
          usageMoments,
          loyaltyPrograms,
          paymentTypes,
          roomTypes,
          airports,
          destinations,
          pointsOfInterest,
          suppliers,
          expenseCategories,
          serviceProducts,
          visaTypes,
          loading: false,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return state;
}

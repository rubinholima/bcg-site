"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface LogisticaLookupOption {
  id: string;
  name: string;
  capacity?: number;
  transportCompanyId?: string | null;
}

interface LookupsState {
  hotels: LogisticaLookupOption[];
  transportCompanies: LogisticaLookupOption[];
  usageMoments: LogisticaLookupOption[];
  loyaltyPrograms: LogisticaLookupOption[];
  paymentTypes: LogisticaLookupOption[];
  roomTypes: LogisticaLookupOption[];
  loading: boolean;
}

const EMPTY: LookupsState = {
  hotels: [],
  transportCompanies: [],
  usageMoments: [],
  loyaltyPrograms: [],
  paymentTypes: [],
  roomTypes: [],
  loading: true,
};

export function useLogisticaCadastrosLookups(): LookupsState {
  const [state, setState] = useState<LookupsState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<LogisticaLookupOption[]>("/logistica-cadastros/hotels?activeOnly=true"),
      api.get<LogisticaLookupOption[]>("/logistica-cadastros/transport-companies?activeOnly=true"),
      api.get<LogisticaLookupOption[]>("/logistica-cadastros/usage-moments?activeOnly=true"),
      api.get<LogisticaLookupOption[]>("/logistica-cadastros/loyalty-programs?activeOnly=true"),
      api.get<LogisticaLookupOption[]>("/logistica-cadastros/payment-types?activeOnly=true"),
      api.get<LogisticaLookupOption[]>("/logistica-cadastros/room-types?activeOnly=true"),
    ])
      .then(([hotels, transport, moments, loyalty, payment, rooms]) => {
        if (cancelled) return;
        setState({
          hotels: Array.isArray(hotels.data) ? hotels.data : [],
          transportCompanies: Array.isArray(transport.data) ? transport.data : [],
          usageMoments: Array.isArray(moments.data) ? moments.data : [],
          loyaltyPrograms: Array.isArray(loyalty.data) ? loyalty.data : [],
          paymentTypes: Array.isArray(payment.data) ? payment.data : [],
          roomTypes: Array.isArray(rooms.data) ? rooms.data : [],
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...EMPTY, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

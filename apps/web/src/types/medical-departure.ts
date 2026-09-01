export type MedicalDepartureCareType =
  | "medico"
  | "dentista"
  | "exames"
  | "pronto_atendimento"
  | "emergencia"
  | "cirurgia"
  | "outro";

export type MedicalDepartureTransportMode =
  | "proprio"
  | "onibus"
  | "aplicativo"
  | "taxi"
  | "ambulancia_clube"
  | "carro_clube"
  | "outro";

export type MedicalDepartureStatus =
  | "programada"
  | "em_atendimento"
  | "retornou"
  | "cancelada";

export type MedicalDepartureDocument = {
  id: string;
  name: string;
  documentType: string;
  fileUrl: string;
};

export type MedicalDeparture = {
  id: string;
  tenantId: string;
  playerId: string;
  category?: string | null;
  departedAt: string;
  returnedAt?: string | null;
  destination: string;
  careType: MedicalDepartureCareType;
  reason: string;
  careSummary?: string | null;
  transportMode: MedicalDepartureTransportMode;
  transportNotes?: string | null;
  companionStaffId?: string | null;
  companionName?: string | null;
  companionPhone?: string | null;
  status: MedicalDepartureStatus;
  notes?: string | null;
  documentIds?: string[] | null;
  documents?: MedicalDepartureDocument[];
  createdAt: string;
  updatedAt: string;
  player?: {
    id: string;
    name: string;
    category?: string | null;
    photoUrl?: string | null;
    jerseyNumber?: number | null;
  };
  tenant?: { id: string; name: string; slug?: string };
};

export type CreateMedicalDeparturePayload = {
  tenantId: string;
  playerId: string;
  category?: string;
  departedAt: string;
  returnedAt?: string;
  destination: string;
  careType: MedicalDepartureCareType;
  reason: string;
  careSummary?: string;
  transportMode: MedicalDepartureTransportMode;
  transportNotes?: string;
  companionStaffId?: string;
  companionName?: string;
  companionPhone?: string;
  status?: MedicalDepartureStatus;
  notes?: string;
  documentIds?: string[];
};

export type UpdateMedicalDeparturePayload = CreateMedicalDeparturePayload;

export type MedicalDepartureReportsDashboard = {
  summary: { total: number; uniquePlayers: number };
  byCareType: Array<{ careType: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byTransport: Array<{ transportMode: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  departures: Array<{
    id: string;
    departedAt: string;
    returnedAt?: string | null;
    destination: string;
    careType: string;
    reason: string;
    careSummary?: string | null;
    transportMode: string;
    status: string;
    category?: string | null;
    companionName?: string | null;
    player?: { id: string; name: string; jerseyNumber?: number | null } | null;
    tenant?: { id: string; name: string } | null;
    documents?: MedicalDepartureDocument[];
  }>;
};

export type NursingSessionStatus = "active" | "completed" | "cancelled";
export type NursingAttachmentKind = "exame" | "pedido" | "outro";

export interface NursingDiagnosis {
  id: string;
  name: string;
  isSystem: boolean;
  active: boolean;
}

export interface NursingProductRef {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  currentStock?: number | null;
}

export interface NursingTreatment {
  id: string;
  name: string;
  kind: string;
  productId: string | null;
  defaultUnit: string | null;
  isSystem: boolean;
  active: boolean;
  product?: NursingProductRef | null;
}

export interface NursingAttachment {
  label: string;
  fileUrl: string;
  kind?: NursingAttachmentKind;
}

export interface NursingSessionDiagnosis {
  id: string;
  sessionId: string;
  diagnosisId: string | null;
  diagnosisLabel: string | null;
  sortOrder: number;
  diagnosis?: NursingDiagnosis | null;
}

export interface NursingSessionTreatment {
  id: string;
  sessionId: string;
  treatmentId: string | null;
  treatmentLabel: string | null;
  productId: string | null;
  quantityUsed: number | null;
  stockMovementId: string | null;
  deductStock: boolean;
  sortOrder: number;
  notes: string | null;
  treatment?: NursingTreatment | null;
  product?: NursingProductRef | null;
}

export interface NursingSession {
  id: string;
  tenantId: string;
  playerId: string;
  category: string | null;
  attendedAt: string;
  symptoms: string | null;
  nurseStaffId: string | null;
  nurseName: string | null;
  estimatedDays: number | null;
  estimatedEndDate: string | null;
  exemptFromTraining: boolean | null;
  treatmentNotes: string | null;
  attachments: NursingAttachment[] | null;
  status: NursingSessionStatus;
  endedAt: string | null;
  sessionDiagnoses?: NursingSessionDiagnosis[];
  sessionTreatments?: NursingSessionTreatment[];
  player?: {
    id: string;
    name: string;
    category: string | null;
    photoUrl: string | null;
    tenantId: string;
  };
  tenant?: { id: string; name: string; slug: string };
}

export interface NursingSessionDiagnosisInput {
  diagnosisId?: string;
  diagnosisLabel?: string;
}

export interface NursingSessionTreatmentInput {
  treatmentId?: string;
  treatmentLabel?: string;
  productId?: string;
  quantityUsed?: number;
  deductStock?: boolean;
  notes?: string;
}

export interface CreateNursingSessionPayload {
  tenantId: string;
  playerId: string;
  category?: string;
  attendedAt?: string;
  symptoms?: string;
  nurseStaffId?: string;
  nurseName?: string;
  estimatedDays?: number;
  estimatedEndDate?: string;
  exemptFromTraining?: boolean | null;
  treatmentNotes?: string;
  attachments?: NursingAttachment[];
  diagnoses?: NursingSessionDiagnosisInput[];
  treatments?: NursingSessionTreatmentInput[];
}

export interface UpdateNursingSessionPayload extends CreateNursingSessionPayload {
  status?: NursingSessionStatus;
}

export interface NursingProductOption extends NursingProductRef {
  inventoryKind?: string | null;
}

export type SelectedNursingTreatment = {
  treatmentId: string;
  productId: string;
  quantityUsed: string;
  deductStock: boolean;
};

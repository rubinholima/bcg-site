"use client";

import { Plus, Trash2, Eye, EyeOff, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPhoneForDisplay, phoneToDigits } from "@/lib/format-phone";
import {
  normalizeMedicalHistory,
  BLOOD_TYPES,
  type MedicalProfile,
  type MedicalEntry,
} from "./player-module-types";
import { MEDICAL_STAFF_ROLES } from "@/lib/medical-staff-roles";

export interface MedicalStaffOption {
  id: string;
  name: string;
  role: string;
  crmCoren?: string | null;
}

function isFieldPublic(
  publicFields: Record<string, boolean> | null | undefined,
  key: string
): boolean {
  if (!publicFields || typeof publicFields[key] !== "boolean") return true;
  return publicFields[key];
}

interface MedicalHistoryBlockProps {
  medicalHistory: unknown;
  publicFields?: Record<string, boolean> | null;
  onUpdate: (patch: { medicalHistory?: { profile: MedicalProfile; records: MedicalEntry[] }; publicFields?: Record<string, boolean> }) => void;
  showPublicToggle?: boolean;
  /** Lista de profissionais do Depto Médico para preencher "quem atendeu" */
  medicalStaff?: MedicalStaffOption[];
  /** Contato de emergência (vem do cadastro do jogador — só leitura aqui) */
  emergencyContactName?: string | null;
  emergencyContactEmail?: string | null;
  emergencyContactPhone?: string | null;
}

function getRoleLabel(roleValue: string): string {
  return MEDICAL_STAFF_ROLES.find((r) => r.value === roleValue)?.label ?? roleValue;
}

export function MedicalHistoryBlock({
  medicalHistory,
  publicFields,
  onUpdate,
  showPublicToggle = true,
  medicalStaff = [],
  emergencyContactName,
  emergencyContactEmail,
  emergencyContactPhone,
}: MedicalHistoryBlockProps) {
  const { profile: medicalProfile, records: medicalList } = normalizeMedicalHistory(medicalHistory);
  const hasAnyEmergency = emergencyContactName || emergencyContactEmail || emergencyContactPhone;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Histórico médico</CardTitle>
            <CardDescription>
              Lesões, afastamentos e períodos de recuperação
            </CardDescription>
          </div>
          {showPublicToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={isFieldPublic(publicFields, "medicalHistory") ? "Visível na página pública" : "Oculto na página pública"}
              onClick={() => {
                const pf = { ...(publicFields ?? {}) };
                pf.medicalHistory = !isFieldPublic(publicFields, "medicalHistory");
                onUpdate({ publicFields: pf });
              }}
            >
              {isFieldPublic(publicFields, "medicalHistory") ? (
                <Eye className="h-4 w-4 text-amber-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Dados de saúde do atleta</h3>
          <p className="text-xs text-muted-foreground">
            Informações gerais para registro e acompanhamento médico
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo de sangue</Label>
              <Select
                value={medicalProfile.bloodType || "__none__"}
                onValueChange={(v) =>
                  onUpdate({
                    medicalHistory: {
                      profile: { ...medicalProfile, bloodType: v === "__none__" ? undefined : v },
                      records: medicalList,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Alergias</Label>
              <Input
                placeholder="Ex: penicilina, dipirona, lactose..."
                value={medicalProfile.allergies ?? ""}
                onChange={(e) =>
                  onUpdate({
                    medicalHistory: {
                      profile: { ...medicalProfile, allergies: e.target.value || undefined },
                      records: medicalList,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label>Doenças crônicas</Label>
              <Input
                placeholder="Ex: asma, diabetes, hipertensão..."
                value={medicalProfile.chronicDiseases ?? ""}
                onChange={(e) =>
                  onUpdate({
                    medicalHistory: {
                      profile: { ...medicalProfile, chronicDiseases: e.target.value || undefined },
                      records: medicalList,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label>Medicamentos em uso</Label>
              <Input
                placeholder="Medicamentos que o atleta toma regularmente"
                value={medicalProfile.medications ?? ""}
                onChange={(e) =>
                  onUpdate({
                    medicalHistory: {
                      profile: { ...medicalProfile, medications: e.target.value || undefined },
                      records: medicalList,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label>Outras condições / observações</Label>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Outras informações de saúde relevantes"
                value={medicalProfile.otherConditions ?? ""}
                onChange={(e) =>
                  onUpdate({
                    medicalHistory: {
                      profile: { ...medicalProfile, otherConditions: e.target.value || undefined },
                      records: medicalList,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Registros (lesões, afastamentos)</h3>
          {medicalList.map((entry, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-2 mb-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Registro {idx + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = medicalList.filter((_, i) => i !== idx);
                    onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="date"
                  placeholder="Data"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={entry.date ?? ""}
                  onChange={(e) => {
                    const next = [...medicalList];
                    (next[idx] as MedicalEntry).date = e.target.value || undefined;
                    onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                  }}
                />
                <Input
                  placeholder="Tipo (ex: lesão muscular)"
                  value={entry.type ?? ""}
                  onChange={(e) => {
                    const next = [...medicalList];
                    (next[idx] as MedicalEntry).type = e.target.value || undefined;
                    onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                  }}
                />
                <Input
                  type="number"
                  placeholder="Dias afastado"
                  value={entry.daysOut ?? ""}
                  onChange={(e) => {
                    const next = [...medicalList];
                    (next[idx] as MedicalEntry).daysOut = e.target.value ? Number(e.target.value) : undefined;
                    onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                  }}
                />
                <Input
                  type="number"
                  placeholder="Jogos perdidos"
                  value={entry.gamesMissed ?? ""}
                  onChange={(e) => {
                    const next = [...medicalList];
                    (next[idx] as MedicalEntry).gamesMissed = e.target.value ? Number(e.target.value) : undefined;
                    onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                  }}
                />
              </div>
              <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quem atendeu</p>
                {medicalStaff.length > 0 && (
                  <Select
                    value={
                      (entry.attendedByName || entry.attendedByRole || entry.attendedByCrm)
                        ? medicalStaff.find(
                            (s) =>
                              s.name === (entry.attendedByName ?? "") &&
                              s.role === (entry.attendedByRole ?? "") &&
                              (s.crmCoren ?? "") === (entry.attendedByCrm ?? "")
                          )?.id ?? "__manual__"
                        : "__manual__"
                    }
                    onValueChange={(v) => {
                      const next = [...medicalList];
                      const rec = next[idx] as MedicalEntry;
                      if (v === "__manual__") {
                        rec.attendedByName = undefined;
                        rec.attendedByRole = undefined;
                        rec.attendedByCrm = undefined;
                      } else {
                        const staff = medicalStaff.find((s) => s.id === v);
                        if (staff) {
                          rec.attendedByName = staff.name;
                          rec.attendedByRole = staff.role;
                          rec.attendedByCrm = staff.crmCoren ?? undefined;
                        }
                      }
                      onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                    }}
                  >
                    <SelectTrigger className="h-9 text-foreground">
                      <SelectValue placeholder="Escolher profissional cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__manual__">— Ou preencher manualmente</SelectItem>
                      {medicalStaff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({getRoleLabel(s.role)}){s.crmCoren ? ` — ${s.crmCoren}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    placeholder="Nome (ex: Dr. João Silva)"
                    className="text-foreground h-9"
                    value={entry.attendedByName ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).attendedByName = e.target.value || undefined;
                      onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                    }}
                  />
                  <Input
                    placeholder="Cargo (ex: médico, enfermeiro)"
                    className="text-foreground h-9"
                    value={entry.attendedByRole ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).attendedByRole = e.target.value || undefined;
                      onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                    }}
                  />
                  <Input
                    placeholder="CRM / COREN"
                    className="text-foreground h-9"
                    value={entry.attendedByCrm ?? ""}
                    onChange={(e) => {
                      const next = [...medicalList];
                      (next[idx] as MedicalEntry).attendedByCrm = e.target.value || undefined;
                      onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                    }}
                  />
                </div>
                {(entry.attendedByName || entry.attendedByRole || entry.attendedByCrm) && (
                  <p className="text-xs text-muted-foreground">
                    Atendido por: {[entry.attendedByName, entry.attendedByRole, entry.attendedByCrm].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Descrição"
                value={entry.description ?? ""}
                onChange={(e) => {
                  const next = [...medicalList];
                  (next[idx] as MedicalEntry).description = e.target.value || undefined;
                  onUpdate({ medicalHistory: { profile: medicalProfile, records: next } });
                }}
              />
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              onUpdate({
                medicalHistory: { profile: medicalProfile, records: [...medicalList, {}] },
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar registro
          </Button>
        </div>

        {hasAnyEmergency && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Contato de emergência
            </h3>
            <p className="text-xs text-muted-foreground">
              Dados do cadastro do jogador (Dados base → Contato/responsável emergência)
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Nome:</span>
                <span className="text-foreground">{emergencyContactName?.trim() || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">E-mail:</span>
                {emergencyContactEmail?.trim() ? (
                  <a href={`mailto:${emergencyContactEmail.trim()}`} className="text-foreground hover:underline truncate">{emergencyContactEmail.trim()}</a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">Telefone:</span>
                {emergencyContactPhone?.trim() ? (
                  <a href={`tel:${phoneToDigits(emergencyContactPhone)}`} className="text-foreground hover:underline">{formatPhoneForDisplay(emergencyContactPhone)}</a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import {
  User,
  Contact,
  Trophy,
  Scale,
  Plane,
} from "lucide-react";
import { BostonTvDashboardTabs } from "@/components/boston-tv/BostonTvDashboardTabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { formatPhoneForDisplay } from "@/lib/format-phone";
import { formatCpfForDisplay, formatCpfInput } from "@/lib/format-cpf";
import { FootballPositionSelect } from "@/components/dashboard/players/FootballPositionSelect";
import {
  CLOTHING_SIZE_FIELDS,
  CLOTHING_SIZE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PIX_KEY_TYPE_OPTIONS,
  RH_FACTOR_OPTIONS,
  SKIN_COLOR_OPTIONS,
  SPORTS_SITUATION_OPTIONS,
  appendCategoryHistoryOnChange,
  computeAge,
  normalizeSportsSituation,
  type PlayerAddressBlock,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";
import { normalizeCityName } from "@/lib/brazil-location-utils";
import { BRAZIL_BANK_SUGGESTIONS, normalizeBankName } from "@/lib/brazil-banks";
import { formatDateDayMonYear } from "@/lib/format-date";
import { ExpandableSection, FormGrid, RequiredMark, SectionDivider } from "./ExpandableSection";
import { PlayerDocumentsSection } from "./PlayerDocumentsSection";
import { PlayerContractsSection } from "./PlayerContractsSection";
import { PlayerCategoryHistorySection } from "./PlayerCategoryHistorySection";
import { PlayerLoanSection } from "./PlayerLoanSection";
import { PlayerTravelTab } from "./PlayerTravelTab";
import { PlayerAgendaTab } from "./PlayerAgendaTab";

interface CategoryOption {
  value: string;
  labelPT: string;
}

interface PlayerRegistrationSectionsProps {
  playerId: string;
  name: string;
  category: string | null | undefined;
  photoUrl: string | null | undefined;
  birthDate: string | null | undefined;
  nationality: string | null | undefined;
  contactEmail: string | null | undefined;
  contactPhone: string | null | undefined;
  emergencyContactName: string | null | undefined;
  emergencyContactEmail: string | null | undefined;
  emergencyContactPhone: string | null | undefined;
  height: number | null | undefined;
  weight: number | null | undefined;
  preferredFoot: string | null | undefined;
  jerseyNumber: number | null | undefined;
  position: string | null | undefined;
  status: string | null | undefined;
  profile: PlayerRegistrationProfile;
  categoriesForDropdown: CategoryOption[];
  pendingPhotoFile: File | null;
  onNameChange: (v: string) => void;
  onCategoryChange: (v: string | null) => void;
  onPhotoUrlChange: (v: string | null) => void;
  onPendingPhotoFile: (f: File | null) => void;
  onPlayerField: (field: string, value: unknown) => void;
  onProfileChange: (next: PlayerRegistrationProfile) => void;
  canAccessLogistica?: boolean;
  canAccessJuridico?: boolean;
  canAccessRh?: boolean;
  tenantName?: string | null;
  responsibleUserName?: string;
}

function patchProfile(
  profile: PlayerRegistrationProfile,
  section: keyof PlayerRegistrationProfile,
  patch: Record<string, unknown>,
): PlayerRegistrationProfile {
  return {
    ...profile,
    [section]: { ...(profile[section] as object), ...patch },
  };
}

function patchAddress(
  profile: PlayerRegistrationProfile,
  block: "main" | "local",
  patch: Partial<PlayerAddressBlock>,
): PlayerRegistrationProfile {
  return {
    ...profile,
    address: {
      ...profile.address,
      [block]: { ...profile.address?.[block], ...patch },
    },
  };
}

export function PlayerRegistrationSections(props: PlayerRegistrationSectionsProps) {
  const {
    playerId,
    name,
    category,
    photoUrl,
    birthDate,
    nationality,
    contactEmail,
    contactPhone,
    emergencyContactName,
    emergencyContactEmail,
    emergencyContactPhone,
    height,
    weight,
    preferredFoot,
    jerseyNumber,
    position,
    status,
    profile,
    categoriesForDropdown,
    pendingPhotoFile,
    onNameChange,
    onCategoryChange,
    onPhotoUrlChange,
    onPendingPhotoFile,
    onPlayerField,
    onProfileChange,
    canAccessLogistica = false,
    canAccessJuridico = false,
    canAccessRh = false,
    tenantName,
    responsibleUserName = "Sistema",
  } = props;

  const handleCategoryChange = (v: string | null) => {
    const nextProfile = appendCategoryHistoryOnChange(profile, {
      previousCategory: category,
      newCategory: v,
      responsible: responsibleUserName,
    });
    onProfileChange(nextProfile);
    onCategoryChange(v);
  };

  const handleSituationChange = (v: string) => {
    onProfileChange(patchProfile(profile, "sports", { situation: v || undefined }));
    if (v === "desligado") onPlayerField("status", "not_in_squad");
    else if (v === "ativo") onPlayerField("status", "available");
  };

  const age = computeAge(birthDate);
  const personal = profile.personal ?? {};
  const sports = profile.sports ?? {};
  const complement = profile.complement ?? {};
  const extras = profile.extras ?? {};
  const characteristics = profile.characteristics ?? {};
  const agent = profile.agent ?? {};
  const clothing = profile.clothing ?? {};

  type RegTabId = "identificacao" | "pessoal" | "esportivo" | "juridico" | "logistica";
  const REG_TABS: Array<{ id: RegTabId; label: string; icon: typeof User }> = [
    { id: "identificacao", label: "Identificação", icon: User },
    { id: "pessoal", label: "Pessoal e contato", icon: Contact },
    { id: "esportivo", label: "Esportivo", icon: Trophy },
    { id: "juridico", label: "Documentos e contratos", icon: Scale },
    { id: "logistica", label: "Logística", icon: Plane },
  ];
  const [activeRegTab, setActiveRegTab] = useState<RegTabId>("identificacao");

  return (
    <div className="space-y-5">
      <BostonTvDashboardTabs
        tabs={REG_TABS}
        active={activeRegTab}
        onChange={setActiveRegTab}
        ariaLabel="Seções do cadastro do atleta"
        uppercase
        compact
        stretch
      />

      {activeRegTab === "identificacao" && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
      <ExpandableSection title="Identificação e foto" description="Nome, categoria e avatar" defaultOpen>
        <FormGrid cols={4}>
          <div className="space-y-2 sm:col-span-2">
            <Label>
              Nome completo
              <RequiredMark />
            </Label>
            <Input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Nome do atleta" />
          </div>
          <div className="space-y-2">
            <Label>Apelido</Label>
            <Input
              value={personal.nickname ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "personal", { nickname: e.target.value || undefined }))
              }
              placeholder="Apelido"
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category || "none"} onValueChange={(v) => handleCategoryChange(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {categoriesForDropdown.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.labelPT}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Situação no clube</Label>
            <Select
              value={normalizeSportsSituation(sports.situation)}
              onValueChange={handleSituationChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS_SITUATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {normalizeSportsSituation(sports.situation) === "desligado" ? (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Desligados saem da lista principal e ficam em Cadastros → Futebol → Atletas desligados.
              </p>
            ) : null}
            {normalizeSportsSituation(sports.situation) === "emprestado" ? (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Emprestados saem da lista por categoria e aparecem em Atletas emprestados. Preencha a seção Empréstimo.
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>ID interno</Label>
            <Input value={playerId.slice(-8).toUpperCase()} readOnly className="bg-muted/50 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>Matrícula RH</Label>
            <Input
              value={personal.rhEnrollment ?? ""}
              readOnly={!!personal.rhEnrollment?.trim()}
              className={personal.rhEnrollment?.trim() ? "bg-muted/50 text-muted-foreground uppercase font-mono" : undefined}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "personal", { rhEnrollment: e.target.value || undefined }))
              }
            />
            {personal.rhEnrollment?.trim() ? (
              <p className="text-xs text-muted-foreground">
                Preenchida automaticamente pelo cadastro RH vinculado.
              </p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-4">
            <Label>Foto / Avatar</Label>
            <PhotoUploadWithName
              sizeKey="jogadores"
              value={photoUrl ?? ""}
              onChange={(v) => onPhotoUrlChange(v || null)}
              urlPlaceholder="Ou URL"
              namePlaceholder="Ex: foto-nome-do-atleta"
              deferredUpload
              onFileSelect={(f) => onPendingPhotoFile(f ?? null)}
              pendingFile={pendingPhotoFile}
              requireNameToUpload={name}
              displayNameAuto={
                getPhotoDisplayName(name, category || PHOTO_DEPARTMENT_BY_SIZE_KEY.jogadores) || undefined
              }
              showAutomaticPhotoNameNote={false}
              showFileFormatHint={false}
              showUrlInput={false}
              hidePreview
            />
          </div>
        </FormGrid>
      </ExpandableSection>

      <PlayerCategoryHistorySection profile={profile} currentCategory={category} />
        </div>
      )}

      {activeRegTab === "pessoal" && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
      <ExpandableSection title="Dados pessoais" description="Documentos, contato e filiação" defaultOpen>
        <FormGrid cols={4}>
          <div className="space-y-2">
            <Label>Chegada no clube</Label>
            <Input
              type="date"
              className="text-foreground"
              value={personal.clubArrivalDate ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "personal", { clubArrivalDate: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Data nascimento
              <RequiredMark />
            </Label>
            <Input
              type="date"
              className="text-foreground"
              value={birthDate ?? ""}
              onChange={(e) => onPlayerField("birthDate", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Idade</Label>
            <Input value={age != null ? String(age) : "—"} readOnly className="bg-muted/50 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label>
              Sexo / Gênero
              <RequiredMark />
            </Label>
            <Select
              value={personal.gender ?? ""}
              onValueChange={(v) => onProfileChange(patchProfile(profile, "personal", { gender: v || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>
              CPF
              <RequiredMark />
            </Label>
            <Input
              value={formatCpfForDisplay(personal.cpf)}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "personal", {
                    cpf: formatCpfInput(e.target.value) || undefined,
                  }),
                )
              }
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>RG / RNE</Label>
            <Input
              value={personal.rg ?? ""}
              onChange={(e) => onProfileChange(patchProfile(profile, "personal", { rg: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Órgão emissor</Label>
            <Input
              value={personal.rgIssuer ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "personal", { rgIssuer: e.target.value || undefined }))
              }
              placeholder="SSP-DF"
            />
          </div>
          <div className="space-y-2">
            <Label>Validade RG</Label>
            <Input
              type="date"
              className="text-foreground"
              value={personal.rgValidUntil ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "personal", { rgValidUntil: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Estado civil
              <RequiredMark />
            </Label>
            <Select
              value={personal.maritalStatus ?? ""}
              onValueChange={(v) =>
                onProfileChange(patchProfile(profile, "personal", { maritalStatus: v || undefined }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              E-mail
              <RequiredMark />
            </Label>
            <Input
              type="email"
              value={contactEmail ?? ""}
              onChange={(e) => onPlayerField("contactEmail", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp</Label>
            <Input
              value={contactPhone ?? ""}
              onChange={(e) => onPlayerField("contactPhone", e.target.value || null)}
              onBlur={(e) => {
                const formatted = formatPhoneForDisplay(e.target.value);
                if (formatted !== (contactPhone ?? "")) onPlayerField("contactPhone", formatted || null);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>
              Naturalidade
              <RequiredMark />
            </Label>
            <Input
              value={personal.birthPlace ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "personal", { birthPlace: e.target.value || undefined }))
              }
              placeholder="Brasília/DF"
            />
          </div>
          <div className="space-y-2">
            <Label>
              Nacionalidade
              <RequiredMark />
            </Label>
            <Input
              value={nationality ?? ""}
              onChange={(e) => onPlayerField("nationality", e.target.value || null)}
              placeholder="Brasil"
            />
          </div>
          <div className="space-y-2">
            <Label>Outras nacionalidades</Label>
            <Input
              value={personal.otherNationalities ?? ""}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "personal", { otherNationalities: e.target.value || undefined }),
                )
              }
            />
          </div>
        </FormGrid>
        <SectionDivider title="Contato de emergência" />
        <FormGrid cols={3}>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={emergencyContactName ?? ""}
              onChange={(e) => onPlayerField("emergencyContactName", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={emergencyContactEmail ?? ""}
              onChange={(e) => onPlayerField("emergencyContactEmail", e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={emergencyContactPhone ?? ""}
              onChange={(e) => onPlayerField("emergencyContactPhone", e.target.value || null)}
            />
          </div>
        </FormGrid>
      </ExpandableSection>

      <ExpandableSection title="Endereços" description="Residência principal e endereço local" defaultOpen={false}>
        <div className="mb-4 flex items-center gap-2">
          <Checkbox
            id="useClubAddress"
            checked={profile.address?.useClubAddress ?? false}
            onCheckedChange={(checked) =>
              onProfileChange({
                ...profile,
                address: { ...profile.address, useClubAddress: checked === true },
              })
            }
          />
          <Label htmlFor="useClubAddress" className="font-normal">
            Usar endereço do clube como referência
          </Label>
        </div>
        {(["main", "local"] as const).map((block) => {
          const label = block === "main" ? "Endereço principal" : "Endereço local";
          const data = profile.address?.[block] ?? {};
          return (
            <div key={block} className="mb-6 last:mb-0">
              <SectionDivider title={label} />
              <FormGrid cols={3}>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={data.street ?? ""}
                    onChange={(e) =>
                      onProfileChange(patchAddress(profile, block, { street: e.target.value || undefined }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input
                    value={data.complement ?? ""}
                    onChange={(e) =>
                      onProfileChange(patchAddress(profile, block, { complement: e.target.value || undefined }))
                    }
                    placeholder="Ex: Casa, apartamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    value={data.neighborhood ?? ""}
                    onChange={(e) =>
                      onProfileChange(patchAddress(profile, block, { neighborhood: e.target.value || undefined }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={data.city ?? ""}
                    onChange={(e) =>
                      onProfileChange(patchAddress(profile, block, { city: e.target.value || undefined }))
                    }
                    onBlur={(e) => {
                      const normalized = normalizeCityName(e.target.value);
                      if (normalized && normalized !== (data.city ?? "")) {
                        onProfileChange(patchAddress(profile, block, { city: normalized }));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input
                    value={data.zipCode ?? ""}
                    onChange={(e) =>
                      onProfileChange(patchAddress(profile, block, { zipCode: e.target.value || undefined }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={data.phone ?? ""}
                    onChange={(e) =>
                      onProfileChange(patchAddress(profile, block, { phone: e.target.value || undefined }))
                    }
                  />
                </div>
              </FormGrid>
            </div>
          );
        })}
      </ExpandableSection>

      <ExpandableSection title="Informações complementares" description="Físico, veículo, custos e observações">
        <FormGrid cols={4}>
          <div className="space-y-2">
            <Label>Raça / cor da pele</Label>
            <Select
              value={complement.skinColor ?? ""}
              onValueChange={(v) =>
                onProfileChange(patchProfile(profile, "complement", { skinColor: v || undefined }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {SKIN_COLOR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.01"
              value={weight ?? ""}
              onChange={(e) => onPlayerField("weight", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Estatura (cm)</Label>
            <Input
              type="number"
              value={height ?? ""}
              onChange={(e) => onPlayerField("height", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fator RH</Label>
            <Select
              value={complement.rhFactor ?? ""}
              onValueChange={(v) =>
                onProfileChange(patchProfile(profile, "complement", { rhFactor: v || undefined }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {RH_FACTOR_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Biotipo físico</Label>
            <Input
              value={complement.physicalBiotype ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "complement", { physicalBiotype: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Placa do veículo</Label>
            <Input
              value={complement.vehiclePlate ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "complement", { vehiclePlate: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo / cor</Label>
            <Input
              value={complement.vehicleModel ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "complement", { vehicleModel: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Centro de custo</Label>
            <Input
              value={complement.costCenter ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "complement", { costCenter: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Site pessoal</Label>
            <Input
              value={complement.personalWebsite ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "complement", { personalWebsite: e.target.value || undefined }))
              }
              placeholder="https://"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Rede social principal</Label>
            <Input
              value={complement.mainSocialNetwork ?? ""}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "complement", { mainSocialNetwork: e.target.value || undefined }),
                )
              }
              placeholder="instagram.com/pessoa"
            />
          </div>
          <div className="space-y-2 sm:col-span-4">
            <Label>Observação</Label>
            <Textarea
              value={complement.observation ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "complement", { observation: e.target.value || undefined }))
              }
              rows={3}
            />
          </div>
        </FormGrid>
      </ExpandableSection>

      <ExpandableSection title="Dados extras" description="PIX, plano de saúde, escolaridade e conta bancária">
        <datalist id="player-bank-suggestions">
          {BRAZIL_BANK_SUGGESTIONS.map((bank) => (
            <option key={bank} value={bank} />
          ))}
        </datalist>
        <SectionDivider title="PIX" />
        <FormGrid cols={3}>
          <div className="space-y-2">
            <Label>Tipo de chave</Label>
            <Select
              value={extras.pixKeyType ?? ""}
              onValueChange={(v) => onProfileChange(patchProfile(profile, "extras", { pixKeyType: v || undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PIX_KEY_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input
              list="player-bank-suggestions"
              value={extras.pixBank ?? ""}
              onChange={(e) => onProfileChange(patchProfile(profile, "extras", { pixBank: e.target.value || undefined }))}
              onBlur={(e) => {
                const normalized = normalizeBankName(e.target.value);
                if (normalized && normalized !== (extras.pixBank ?? "")) {
                  onProfileChange(patchProfile(profile, "extras", { pixBank: normalized }));
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input
              value={extras.pixKey ?? ""}
              onChange={(e) => onProfileChange(patchProfile(profile, "extras", { pixKey: e.target.value || undefined }))}
            />
          </div>
        </FormGrid>
        <SectionDivider title="Plano de saúde" />
        <FormGrid cols={4}>
          <div className="space-y-2">
            <Label>Operadora</Label>
            <Input
              value={extras.healthPlanOperator ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { healthPlanOperator: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Data inclusão</Label>
            <Input
              type="date"
              className="text-foreground"
              value={extras.healthPlanInclusionDate ?? ""}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "extras", { healthPlanInclusionDate: e.target.value || undefined }),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Registro</Label>
            <Input
              value={extras.healthPlanRegistration ?? ""}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "extras", { healthPlanRegistration: e.target.value || undefined }),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Data vencimento</Label>
            <Input
              type="date"
              className="text-foreground"
              value={extras.healthPlanExpiryDate ?? ""}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "extras", { healthPlanExpiryDate: e.target.value || undefined }),
                )
              }
            />
          </div>
        </FormGrid>
        <SectionDivider title="Escolaridade" />
        <FormGrid cols={4}>
          <div className="space-y-2">
            <Label>Escolaridade</Label>
            <Input
              value={extras.educationLevel ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { educationLevel: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Escola</Label>
            <Input
              value={extras.schoolName ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { schoolName: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Série / ano</Label>
            <Input
              value={extras.schoolGrade ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { schoolGrade: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Turno</Label>
            <Input
              value={(extras.schoolPeriod ?? []).join(", ")}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "extras", {
                    schoolPeriod: e.target.value
                      ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      : undefined,
                  }),
                )
              }
              placeholder="Manhã, tarde…"
            />
          </div>
        </FormGrid>
        <SectionDivider title="Conta bancária" />
        <FormGrid cols={4}>
          <div className="space-y-2">
            <Label>Banco</Label>
            <Input
              list="player-bank-suggestions"
              value={extras.bankName ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { bankName: e.target.value || undefined }))
              }
              onBlur={(e) => {
                const normalized = normalizeBankName(e.target.value);
                if (normalized && normalized !== (extras.bankName ?? "")) {
                  onProfileChange(patchProfile(profile, "extras", { bankName: normalized }));
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo da conta</Label>
            <Input
              value={extras.bankAccountType ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { bankAccountType: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Agência</Label>
            <Input
              value={extras.bankAgency ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { bankAgency: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Nº conta</Label>
            <Input
              value={extras.bankAccountNumber ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "extras", { bankAccountNumber: e.target.value || undefined }))
              }
            />
          </div>
        </FormGrid>
      </ExpandableSection>
        </div>
      )}

      {activeRegTab === "esportivo" && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5">
        <div className="flex min-h-11 items-start gap-3">
          <Checkbox
            id="documentation-approved"
            className="mt-0.5 h-5 w-5 shrink-0 border-amber-400/80 bg-background data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-zinc-950"
            checked={Boolean(sports.documentationApprovedAt)}
            onCheckedChange={(checked) =>
              onProfileChange(
                patchProfile(profile, "sports", {
                  documentationApprovedAt:
                    checked === true
                      ? sports.documentationApprovedAt ?? new Date().toISOString()
                      : undefined,
                }),
              )
            }
          />
          <div className="min-w-0 space-y-1">
            <Label htmlFor="documentation-approved" className="cursor-pointer text-sm font-medium text-foreground">
              Documentação confirmada (RH)
            </Label>
            {sports.documentationApprovedAt ? (
              <p className="text-xs text-muted-foreground">
                Confirmada em {formatDateDayMonYear(new Date(sports.documentationApprovedAt))}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <ExpandableSection title="Dados esportivos" description="Categoria, posição, registros e trajetória" defaultOpen>
        <FormGrid cols={6}>
          <div className="space-y-2">
            <Label>
              Posição
              <RequiredMark />
            </Label>
            <FootballPositionSelect
              value={position}
              onValueChange={(v) => onPlayerField("position", v || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Nº camisa</Label>
            <Input
              type="number"
              min={0}
              max={99}
              value={jerseyNumber ?? ""}
              onChange={(e) => onPlayerField("jerseyNumber", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome na camisa</Label>
            <Input
              value={sports.jerseyName ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "sports", { jerseyName: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>
              Lateralidade
              <RequiredMark />
            </Label>
            <Select
              value={preferredFoot ?? ""}
              onValueChange={(v) => onPlayerField("preferredFoot", v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Esquerdo</SelectItem>
                <SelectItem value="right">Direito</SelectItem>
                <SelectItem value="both">Ambidestro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              CBF
              <RequiredMark />
            </Label>
            <Input
              value={sports.cbf ?? ""}
              onChange={(e) => onProfileChange(patchProfile(profile, "sports", { cbf: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Registro fed. local</Label>
            <Input
              value={sports.localFedRegistration ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "sports", { localFedRegistration: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Comet (CONMEBOL)</Label>
            <Input
              value={sports.comet ?? ""}
              onChange={(e) => onProfileChange(patchProfile(profile, "sports", { comet: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label>CBFS</Label>
            <Input
              value={sports.cbfs ?? ""}
              onChange={(e) => onProfileChange(patchProfile(profile, "sports", { cbfs: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Reg. fed. local (futsal)</Label>
            <Input
              value={sports.localFedRegistrationFutsal ?? ""}
              onChange={(e) =>
                onProfileChange(
                  patchProfile(profile, "sports", { localFedRegistrationFutsal: e.target.value || undefined }),
                )
              }
            />
          </div>
          <div className="space-y-2 flex flex-col justify-end pb-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="internationalized"
                checked={sports.internationalized ?? false}
                onCheckedChange={(checked) =>
                  onProfileChange(patchProfile(profile, "sports", { internationalized: checked === true }))
                }
              />
              <Label htmlFor="internationalized" className="font-normal">
                Internacionalizado
              </Label>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Escolinha (futebol)</Label>
            <Input
              value={sports.footballSchool ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "sports", { footballSchool: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade da escolinha</Label>
            <Input
              value={sports.footballSchoolCity ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "sports", { footballSchoolCity: e.target.value || undefined }))
              }
              onBlur={(e) => {
                const normalized = normalizeCityName(e.target.value);
                if (normalized && normalized !== (sports.footballSchoolCity ?? "")) {
                  onProfileChange(patchProfile(profile, "sports", { footballSchoolCity: normalized }));
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Clube anterior</Label>
            <Input
              value={sports.previousClub ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "sports", { previousClub: e.target.value || undefined }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade do clube anterior</Label>
            <Input
              value={sports.previousClubCity ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "sports", { previousClubCity: e.target.value || undefined }))
              }
              onBlur={(e) => {
                const normalized = normalizeCityName(e.target.value);
                if (normalized && normalized !== (sports.previousClubCity ?? "")) {
                  onProfileChange(patchProfile(profile, "sports", { previousClubCity: normalized }));
                }
              }}
            />
          </div>
        </FormGrid>
      </ExpandableSection>

      <ExpandableSection title="Características" description="Descrições técnicas, táticas e físicas">
        <div className="space-y-4">
          {(
            [
              ["technical", "Descrição técnica", "Alguma descrição técnica sobre o atleta"],
              ["tactical", "Descrição tática", "Alguma descrição tática sobre o atleta"],
              ["physical", "Descrição física", "Alguma descrição física sobre o atleta"],
              ["additional", "Informações adicionais", "Informações adicionais sobre o atleta"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Textarea
                value={characteristics[key] ?? ""}
                onChange={(e) =>
                  onProfileChange(
                    patchProfile(profile, "characteristics", { [key]: e.target.value || undefined }),
                  )
                }
                placeholder={placeholder}
                rows={4}
              />
            </div>
          ))}
        </div>
      </ExpandableSection>

      <ExpandableSection title="Empresário" description="Agente e observações">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasAgent"
              checked={agent.hasAgent ?? false}
              onCheckedChange={(checked) =>
                onProfileChange(patchProfile(profile, "agent", { hasAgent: checked === true }))
              }
            />
            <Label htmlFor="hasAgent" className="font-normal">
              Possui agente
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={agent.observation ?? ""}
              onChange={(e) =>
                onProfileChange(patchProfile(profile, "agent", { observation: e.target.value || undefined }))
              }
              placeholder="Alguma observação sobre este empresário?"
              rows={3}
            />
          </div>
        </div>
      </ExpandableSection>

      <ExpandableSection title="Rouparia" description="Tamanhos de uniformes e calçados">
        <FormGrid cols={6}>
          {CLOTHING_SIZE_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Select
                value={(clothing as Record<string, string | undefined>)[key] ?? ""}
                onValueChange={(v) =>
                  onProfileChange(patchProfile(profile, "clothing", { [key]: v || undefined }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CLOTHING_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </FormGrid>
        <div className="mt-4 space-y-2">
          <Label>Informações adicionais</Label>
          <Textarea
            value={clothing.notes ?? ""}
            onChange={(e) =>
              onProfileChange(patchProfile(profile, "clothing", { notes: e.target.value || undefined }))
            }
            rows={3}
          />
        </div>
      </ExpandableSection>
        </div>
      )}

      {activeRegTab === "juridico" && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
      <PlayerDocumentsSection
        playerId={playerId}
        profile={profile}
        onProfileChange={onProfileChange}
      />

      <PlayerContractsSection
        playerId={playerId}
        tenantName={tenantName}
        profile={profile}
        onProfileChange={onProfileChange}
        canAccessJuridico={canAccessJuridico}
        canAccessRh={canAccessRh}
      />

      <PlayerLoanSection profile={profile} tenantName={tenantName} onProfileChange={onProfileChange} />
        </div>
      )}

      {activeRegTab === "logistica" && (
        <div className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-4 sm:p-5">
      <PlayerAgendaTab playerId={playerId} canAccessLogistica={canAccessLogistica} />

      <PlayerTravelTab
        playerId={playerId}
        profile={profile}
        onProfileChange={onProfileChange}
        canAccessLogistica={canAccessLogistica}
      />
        </div>
      )}

    </div>
  );
}

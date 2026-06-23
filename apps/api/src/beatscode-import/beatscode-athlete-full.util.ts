import { normalizeBeatscodeRow } from './beatscode-row.util';

/** Achata o payload de `/athlete-full` para o mapper. */
export function flattenAthleteFullPayload(full: Record<string, unknown>): Record<string, unknown> {
  const data = (full.data ?? {}) as Record<string, unknown>;
  const dataExtra = (full.dataExtra ?? {}) as Record<string, unknown>;
  const businessman = (full.businessman ?? {}) as Record<string, unknown>;
  const characteristics = (full.characteristics ?? {}) as Record<string, unknown>;
  const bankAccount = (dataExtra.bankAccount ?? null) as Record<string, unknown> | null;
  const pix = dataExtra.pix as Record<string, unknown> | undefined;
  const voterIdCard = dataExtra.voterIdCard as Record<string, unknown> | undefined;
  const workCard = dataExtra.workCard as Record<string, unknown> | undefined;
  const healthPlan = dataExtra.healthPlan as Record<string, unknown> | undefined;
  const schooling = dataExtra.schooling as Record<string, unknown> | undefined;

  const flat: Record<string, unknown> = {
    ...data,
    employeeId: full.employeeId ?? full.id,
    lastConvocation: full.lastConvocation,
    email: data.email ?? data.personalEmail,
    phone: data.phone,
    cpf: data.cpf,
    rg: data.rg,
    rgIssuer: data.rgIssuer,
    cbf: data.cbf,
    height: data.height,
    weight: data.weight,
    biotype: data.biotype,
    carLicensePlate: data.carLicensePlate,
    carModel: data.carModel,
    costCenter: data.costCenter ?? data.costCenterId,
    shirtName: data.shirtName,
    internationalized: data.internationalization,
    athleteSituationId: data.athleteSituationId,
    beatscodeAttachmentMap: data.attachment,
    beatscodeContracts: full.contract,
    observationBusinessman: businessman.observationBusinessman,
    businessmanId: businessman.businessmanId,
    agencyLegalRepresentativeId: businessman.agencyLegalRepresentativeId,
    technicalDescription: characteristics.technicalDescription,
    physicalDescription: characteristics.physicalDescription,
    tacticalDescription: characteristics.tacticalDescription,
    additionalInformation: characteristics.additionalInformation,
    pix,
    pixKey: pix?.key,
    pixKeyType: pix?.keyType,
    pixBankId: pix?.bankId,
    schoolingId: schooling?.id ?? schooling,
    schoolingName: schooling?.name,
    bankId: bankAccount?.bankId,
    bankAgency: bankAccount?.agency,
    bankAccountNumber: bankAccount?.number,
    bankOperation: bankAccount?.operation,
    bankAccountTypeId: bankAccount?.typeId,
    voterIdNumber: voterIdCard?.number ?? voterIdCard?.registration,
    voterZone: voterIdCard?.zone,
    voterSection: voterIdCard?.section,
    voterIdCardCityId: voterIdCard?.cityId ?? data.voterIdCardCityId,
    ctpsNumber: workCard?.number,
    ctpsSeries: workCard?.series,
    healthPlanOperator: healthPlan?.operator ?? healthPlan?.name,
    healthPlanRegistration: healthPlan?.registration,
    healthPlanInclusionDate: healthPlan?.inclusionDate,
    healthPlanExpiryDate: healthPlan?.expiryDate,
    healthPlanExclusionDate: healthPlan?.exclusionDate,
    workVisa: dataExtra.workVisa,
  };

  const attachmentIds: number[] = [];
  const attachmentMap = data.attachment;
  if (attachmentMap && typeof attachmentMap === 'object') {
    for (const entry of Object.values(attachmentMap as Record<string, unknown>)) {
      if (entry && typeof entry === 'object' && entry !== null) {
        const id = Number((entry as Record<string, unknown>).id);
        if (Number.isFinite(id)) attachmentIds.push(id);
      }
    }
  }
  if (attachmentIds.length) flat.attachmentId = attachmentIds;

  return normalizeBeatscodeRow(flat);
}

export function isAthleteFullPayload(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && 'data' in (value as object);
}

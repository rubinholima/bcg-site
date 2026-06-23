import { normalizeSportsSituation } from '../common/sports-situation.util';
import {
  type BeatscodeLookupContext,
  defaultBeatscodeLookupContext,
  normalizeBeatscodeJerseyNumber,
  resolveBeatscodeCityId,
  resolveBeatscodeContacts,
  resolveBeatscodeCountryId,
  resolveBeatscodeDominantFootId,
  resolveBeatscodePositionId,
} from './beatscode-lookups.util';
import {
  buildAddressBlock,
  normalizeDate,
  normalizeBeatscodeRow,
  pickNumber,
  pickString,
  stripEmpty,
} from './beatscode-row.util';
import {
  mapBeatscodePixKeyType,
  normalizeBeatscodeCpf,
  normalizeBeatscodeHeight,
  normalizeBeatscodeWeight,
  resolveBeatscodePlayerStatus,
} from './beatscode-value-maps.util';

import { BEATSCODE_NATIONALITY_FALLBACK } from './beatscode-category.util';

export { mapBeatscodeCategoryName, resolveBeatscodeCategoryKey } from './beatscode-category.util';

function inferCpf(normalized: Record<string, unknown>): string | undefined {
  const direct = pickString(normalized, ['cpf', 'CPF', 'cpfNumber', 'documentCpf']);
  if (direct) return normalizeBeatscodeCpf(direct);

  const pix = normalized.pix;
  if (pix && typeof pix === 'object' && pix !== null) {
    const p = pix as Record<string, unknown>;
    if (String(p.keyType ?? '').toLowerCase() === 'cpf' && p.key) {
      return normalizeBeatscodeCpf(String(p.key));
    }
  }
  if (String(normalized.pixKeyType ?? '').toLowerCase() === 'cpf' && normalized.pixKey) {
    return normalizeBeatscodeCpf(String(normalized.pixKey));
  }
  return undefined;
}

function inferRgOrRne(normalized: Record<string, unknown>): string | undefined {
  return (
    pickString(normalized, ['rg', 'RG', 'rgNumber', 'identityCard']) ??
    pickString(normalized, ['rne', 'RNE', 'foreignerRegistration', 'foreignRegistration', 'rneNumber'])
  );
}

function mapBeatscodeDocuments(
  normalized: Record<string, unknown>,
): Array<Record<string, unknown>> | undefined {
  const attachmentIds = normalized.attachmentId;
  if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) return undefined;
  const now = new Date().toISOString();
  return attachmentIds.map((rawId, index) => {
    const id = String(rawId);
    const num = Number(rawId);
    return {
      id: `beatscode-att-${id}`,
      name: `Documento pessoal ${index + 1}`,
      documentType: 'outro',
      documentCategory: 'pessoal',
      fileUrl: '',
      uploadedAt: now,
      beatscodeAttachmentId: num,
      source: 'beatscode',
      pendingDownload: true,
    };
  });
}

export type BeatscodeMapperContext = {
  lookups: BeatscodeLookupContext;
  characteristicsById?: Map<
    number,
    { technical?: string; tactical?: string; physical?: string; additional?: string }
  >;
};

export type MappedBeatscodePlayer = {
  beatscodeId: string;
  category: string;
  name: string;
  photoPath?: string;
  birthDate?: string;
  nationality?: string;
  height?: number;
  weight?: number;
  preferredFoot?: string;
  jerseyNumber?: number;
  position?: string;
  status?: string;
  contactEmail?: string;
  contactPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  registrationProfile: Record<string, unknown>;
  raw: Record<string, unknown>;
};

function normalizeFoot(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (s.includes('esq') || s.includes('left')) return 'left';
  if (s.includes('dir') || s.includes('right')) return 'right';
  if (s.includes('amb') || s.includes('both')) return 'both';
  return raw.trim().toLowerCase();
}

function buildCharacteristics(
  characteristicsId: unknown,
  ctx: BeatscodeMapperContext,
): Record<string, string> | undefined {
  const id = Number(characteristicsId);
  if (!Number.isFinite(id) || !ctx.characteristicsById) return undefined;
  const row = ctx.characteristicsById.get(id);
  if (!row) return undefined;
  return stripEmpty({
    technical: row.technical,
    tactical: row.tactical,
    physical: row.physical,
    additional: row.additional,
  }) as Record<string, string>;
}

export function mapBeatscodeAthleteRow(
  rowInput: Record<string, unknown>,
  category: string,
  ctx: BeatscodeMapperContext = { lookups: defaultBeatscodeLookupContext() },
): MappedBeatscodePlayer | null {
  const normalized = normalizeBeatscodeRow(rowInput);
  const lookups = ctx.lookups;

  const beatscodeId = pickString(normalized, [
    'employeeId',
    'idEmployee',
    'athleteId',
    'idPerson',
    'personId',
    'id',
  ]);
  const name =
    pickString(normalized, ['name', 'fullName', 'athleteName', 'personName']) ??
    pickString(normalized, ['nickname', 'apelido', 'shortName']);
  if (!beatscodeId || !name) return null;

  const nickname = pickString(normalized, ['nickname', 'apelido', 'shortName']);
  const photoPath = pickString(normalized, ['photo', 'image', 'photoLink', 'avatar', 'picture']);

  const birthPlace =
    resolveBeatscodeCityId(normalized.citizenshipId, lookups) ??
    resolveBeatscodeCityId(normalized.cityId, lookups) ??
    pickString(normalized, ['originCity', 'birthPlace', 'naturalidade']);

  const nationality =
    resolveBeatscodeCountryId(normalized.nationalityId, lookups) ??
    BEATSCODE_NATIONALITY_FALLBACK[Number(normalized.nationalityId)] ??
    pickString(normalized, ['nationality', 'citizenship', 'nacionalidade', 'country']);

  const contacts = resolveBeatscodeContacts(normalized.contactId, lookups);
  const mainCity = resolveBeatscodeCityId(normalized.addressCityId ?? normalized.cityId, lookups);
  const localCity = resolveBeatscodeCityId(normalized.localAddressCityId ?? normalized.localCityId, lookups);

  const mainAddress = buildAddressBlock(normalized, '', mainCity);
  const localAddress = buildAddressBlock(normalized, 'local', localCity);

  const bankName =
    (normalized.bankAccountId
      ? lookups.bankAccountById.get(Number(normalized.bankAccountId))?.bankName ??
        lookups.bankById.get(Number(normalized.pixBankId))
      : undefined) ??
    (normalized.pixBankId ? lookups.bankById.get(Number(normalized.pixBankId)) : undefined);

  const skinColor =
    (normalized.breedId
      ? lookups.breedById.get(Number(normalized.breedId))
      : undefined) ?? pickString(normalized, ['skinColor', 'corPele', 'breed']);

  const educationLevel = normalized.schoolingId
    ? lookups.schoolingById.get(Number(normalized.schoolingId)) ??
      String(normalized.schoolingId)
    : undefined;

  const voterCity = resolveBeatscodeCityId(normalized.voterIdCardCityId, lookups);

  const workVisa = pickString(normalized, ['workVisa', 'visa', 'workVisaNumber']);

  const employeeNotes = [
    pickString(normalized, ['observation']),
    pickString(normalized, ['observationBusinessman']),
    normalized.responsible ? `Responsável: ${String(normalized.responsible)}` : undefined,
    normalized.registerDate ? `Cadastro RH: ${String(normalized.registerDate)}` : undefined,
    normalized.waitingFederation === true ? 'Aguardando federação' : undefined,
    workVisa ? `Visto trabalho: ${workVisa}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');

  const registrationProfile = stripEmpty({
    personal: {
      nickname,
      cpf: inferCpf(normalized),
      rg: inferRgOrRne(normalized),
      rgIssuer: pickString(normalized, [
        'rgIssuer',
        'rg_issuer',
        'orgaoExpedidor',
        'rgIssuingAgency',
        'identityIssuer',
      ]),
      rgValidUntil: normalizeDate(
        pickString(normalized, ['rgValidUntil', 'rgExpiry', 'rgExpirationDate', 'identityValidUntil']),
      ),
      maritalStatus: normalized.maritalStatusId
        ? lookups.maritalById.get(Number(normalized.maritalStatusId))
        : pickString(normalized, ['maritalStatus', 'marital_status', 'estadoCivil']),
      gender: normalized.genderId
        ? lookups.genderById.get(Number(normalized.genderId))
        : pickString(normalized, ['gender', 'sexo', 'genero']),
      birthPlace,
      otherNationalities: nationality,
      rhEnrollment: pickString(normalized, ['rhEnrollment', 'enrollment', 'matricula']),
      clubArrivalDate: normalizeDate(
        pickString(normalized, [
          'clubArrivalDate',
          'arrivalDate',
          'dataChegada',
          'arrivalTeamDate',
        ]),
      ),
    },
    sports: {
      jerseyName: pickString(normalized, ['jerseyName', 'nomeCamisa', 'shirtName']),
      situation: normalizeSportsSituation(
        pickString(normalized, ['situation', 'status', 'situacao']),
      ),
      cbf: pickString(normalized, ['cbf', 'CBF', 'cbfRegistration']),
      localFedRegistration: pickString(normalized, [
        'localFedRegistration',
        'localRegistration',
        'registroFedLocal',
      ]),
      comet: pickString(normalized, ['comet', 'COMET']),
      cbfs: pickString(normalized, ['cbfs', 'CBFS']),
      previousClub: pickString(normalized, ['previousClub', 'lastClub', 'clubeAnterior']),
      previousClubCity:
        pickString(normalized, ['previousClubCity', 'lastClubCity']) ??
        resolveBeatscodeCityId(normalized.previousClubCity, lookups),
      footballSchool: pickString(normalized, ['footballSchool', 'escolinha', 'schoolOrClub']),
      footballSchoolCity: pickString(normalized, ['footballSchoolCity', 'escolinhaCidade']),
      internationalized: normalized.internationalized === true ? true : undefined,
    },
    address: stripEmpty({
      main: mainAddress,
      local: localAddress,
    }),
    complement: stripEmpty({
      skinColor,
      rhFactor: normalized.bloodTypeId
        ? lookups.bloodTypeById.get(Number(normalized.bloodTypeId))
        : undefined,
      physicalBiotype: pickString(normalized, ['physicalBiotype', 'biotype', 'biotype']),
      costCenter: pickString(normalized, ['costCenter', 'costCenterId']),
      observation: employeeNotes || pickString(normalized, ['observation', 'observacao', 'notes']),
    }),
    extras: stripEmpty({
      pixKeyType: mapBeatscodePixKeyType(
        pickString(normalized, ['pixKeyType']) ??
          (normalized.pix && typeof normalized.pix === 'object'
            ? String((normalized.pix as Record<string, unknown>).keyType ?? '')
            : undefined),
      ),
      pixKey: pickString(normalized, ['pixKey']) ??
        (normalized.pix && typeof normalized.pix === 'object'
          ? String((normalized.pix as Record<string, unknown>).key ?? '')
          : undefined),
      pixBank: bankName,
      educationLevel,
      voterCity,
      bankName:
        lookups.bankAccountById.get(Number(normalized.bankAccountId))?.bankName ?? bankName,
      bankAgency: lookups.bankAccountById.get(Number(normalized.bankAccountId))?.agency,
      bankAccountNumber: lookups.bankAccountById.get(Number(normalized.bankAccountId))?.accountNumber,
      bankAccountType: lookups.bankAccountById.get(Number(normalized.bankAccountId))?.accountType,
      observation: pickString(normalized, ['observationBusinessman']),
    }),
    travel: workVisa
      ? {
          visas: [
            {
              id: `beatscode-visa-${beatscodeId}`,
              country: workVisa,
              notes: workVisa,
            },
          ],
        }
      : undefined,
    characteristics: buildCharacteristics(normalized.characteristicsId, ctx),
    agent: stripEmpty({
      hasAgent: normalized.businessmanId != null || normalized.agencyLegalRepresentativeId != null,
      observation: pickString(normalized, ['observationBusinessman']),
    }),
    documents: mapBeatscodeDocuments(normalized),
    beatscode: {
      importedAt: new Date().toISOString(),
      employeeId: beatscodeId,
      athleteRecordId: pickString(normalized, ['id']),
      snapshot: normalized,
      contacts: {
        emails: contacts.emails,
        phones: contacts.phones,
      },
    },
  });

  return {
    beatscodeId,
    category,
    name,
    photoPath,
    birthDate: normalizeDate(
      pickString(normalized, [
        'birthDate',
        'birth_date',
        'birthdate',
        'dataNascimento',
        'dateBirth',
      ]),
    ),
    nationality,
    height: normalizeBeatscodeHeight(pickNumber(normalized, ['height', 'altura', 'heightCm'])),
    weight: normalizeBeatscodeWeight(pickNumber(normalized, ['weight', 'peso', 'weightKg'])),
    preferredFoot:
      normalizeFoot(pickString(normalized, ['preferredFoot', 'dominantFoot', 'peDominante'])) ??
      resolveBeatscodeDominantFootId(normalized.dominantFootId, lookups),
    jerseyNumber: normalizeBeatscodeJerseyNumber(
      pickNumber(normalized, ['jerseyNumber', 'shirtNumber', 'numeroCamisa', 'number']),
    ),
    position:
      pickString(normalized, ['position', 'posicao', 'positionName', 'function']) ??
      resolveBeatscodePositionId(normalized.positionId, lookups),
    status: resolveBeatscodePlayerStatus(normalized),
    contactEmail:
      contacts.primaryEmail ??
      pickString(normalized, ['email', 'contactEmail', 'mail', 'personalEmail']),
    contactPhone: contacts.primaryPhone ?? pickString(normalized, ['phone', 'contactPhone', 'telefone', 'cellphone']),
    emergencyContactName: pickString(normalized, [
      'emergencyContactName',
      'emergencyName',
      'contatoEmergencia',
    ]),
    emergencyContactPhone: pickString(normalized, [
      'emergencyContactPhone',
      'emergencyPhone',
      'telefoneEmergencia',
    ]),
    registrationProfile,
    raw: normalized,
  };
}

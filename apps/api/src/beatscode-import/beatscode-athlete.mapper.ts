/** Mapeia categoria Beatscode → chave BCG (sub20, sub17, sub15, sub14, principal). */
export function mapBeatscodeCategoryName(name: string): string | null {
  const n = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '');

  if (/sub\s*20|sub20|u20|sub-20/.test(n)) return 'sub20';
  if (/sub\s*17|sub17|u17|sub-17/.test(n)) return 'sub17';
  if (/sub\s*15|sub15|u15|sub-15/.test(n)) return 'sub15';
  if (/sub\s*14|sub14|u14|sub-14/.test(n)) return 'sub14';
  if (/sub\s*13|sub13|u13/.test(n)) return 'sub13';
  if (/sub\s*11|sub11|u11/.test(n)) return 'sub11';
  if (/feminino|women|feminine/.test(n)) return 'feminino';
  if (/principal|profissional|adulto|1equipe|1ªequipe|1equipe/.test(n)) return 'principal';
  return null;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v == null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function normalizeFoot(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (s.includes('esq') || s.includes('left')) return 'left';
  if (s.includes('dir') || s.includes('right')) return 'right';
  if (s.includes('amb') || s.includes('both')) return 'both';
  return raw.trim().toLowerCase();
}

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
  contactEmail?: string;
  contactPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  registrationProfile: Record<string, unknown>;
  raw: Record<string, unknown>;
};

function normalizeBeatscodeRow(row: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...row };

  const photo = row.photo;
  if (photo && typeof photo === 'object' && photo !== null && 'link' in photo) {
    const link = (photo as { link?: unknown }).link;
    if (link != null) next.photo = String(link);
  }

  const address = row.address;
  if (address && typeof address === 'object' && address !== null) {
    const addr = address as Record<string, unknown>;
    next.addressStreet = addr.address;
    next.addressComplement = addr.complement;
    next.addressDistrict = addr.district;
    next.addressCep = addr.cep;
    next.addressCityId = addr.cityId;
  }

  return next;
}

export function mapBeatscodeAthleteRow(
  row: Record<string, unknown>,
  category: string,
): MappedBeatscodePlayer | null {
  const normalized = normalizeBeatscodeRow(row);
  const beatscodeId = pickString(normalized, [
    'id',
    'athleteId',
    'employeeId',
    'idPerson',
    'idEmployee',
    'personId',
  ]);
  const name = pickString(normalized, ['name', 'fullName', 'athleteName', 'personName']);
  if (!beatscodeId || !name) return null;

  const nickname = pickString(normalized, ['nickname', 'apelido', 'shortName']);
  const photoPath = pickString(normalized, ['photo', 'image', 'photoLink', 'avatar', 'picture']);

  const registrationProfile: Record<string, unknown> = {
    personal: {
      nickname,
      cpf: pickString(normalized, ['cpf', 'CPF']),
      rg: pickString(normalized, ['rg', 'RG']),
      rgIssuer: pickString(normalized, ['rgIssuer', 'rg_issuer', 'orgaoExpedidor']),
      maritalStatus: pickString(normalized, ['maritalStatus', 'marital_status', 'estadoCivil']),
      gender: pickString(normalized, ['gender', 'sexo', 'genero']),
      birthPlace: pickString(normalized, ['birthPlace', 'naturalidade', 'nationality', 'citizenship']),
      otherNationalities: pickString(normalized, ['otherNationalities', 'other_nationalities']),
      rhEnrollment: pickString(normalized, ['rhEnrollment', 'enrollment', 'matricula']),
      clubArrivalDate: normalizeDate(
        pickString(normalized, ['clubArrivalDate', 'arrivalDate', 'dataChegada', 'arrivalTeamDate']),
      ),
      addressStreet: pickString(normalized, ['addressStreet']),
      addressDistrict: pickString(normalized, ['addressDistrict']),
      addressCep: pickString(normalized, ['addressCep']),
    },
    sports: {
      jerseyName: pickString(normalized, ['jerseyName', 'nomeCamisa', 'shirtName']),
      situation: pickString(normalized, ['situation', 'status', 'situacao']) ?? 'ativo',
      cbf: pickString(normalized, ['cbf', 'CBF', 'cbfRegistration']),
      localFedRegistration: pickString(normalized, [
        'localFedRegistration',
        'localRegistration',
        'registroFedLocal',
      ]),
      comet: pickString(normalized, ['comet', 'COMET']),
      cbfs: pickString(normalized, ['cbfs', 'CBFS']),
      previousClub: pickString(normalized, ['previousClub', 'lastClub', 'clubeAnterior']),
      previousClubCity: pickString(normalized, ['previousClubCity', 'lastClubCity']),
      footballSchool: pickString(normalized, ['footballSchool', 'escolinha', 'schoolOrClub']),
      footballSchoolCity: pickString(normalized, ['footballSchoolCity', 'escolinhaCidade']),
    },
    complement: {
      skinColor: pickString(normalized, ['skinColor', 'corPele']),
      rhFactor: pickString(normalized, ['rhFactor', 'fatorRh']),
      physicalBiotype: pickString(normalized, ['physicalBiotype', 'biotipo']),
      observation: pickString(normalized, ['observation', 'observacao', 'notes']),
    },
    beatscode: {
      importedAt: new Date().toISOString(),
      snapshot: normalized,
    },
  };

  return {
    beatscodeId,
    category,
    name,
    photoPath,
    birthDate: normalizeDate(
      pickString(normalized, ['birthDate', 'birth_date', 'dataNascimento', 'dateBirth', 'birthdate']),
    ),
    nationality: pickString(normalized, ['nationality', 'citizenship', 'nacionalidade', 'country']),
    height: pickNumber(normalized, ['height', 'altura', 'heightCm']),
    weight: pickNumber(normalized, ['weight', 'peso', 'weightKg']),
    preferredFoot: normalizeFoot(pickString(normalized, ['preferredFoot', 'dominantFoot', 'peDominante'])),
    jerseyNumber: pickNumber(normalized, ['jerseyNumber', 'shirtNumber', 'numeroCamisa', 'number']),
    position: pickString(normalized, ['position', 'posicao', 'positionName', 'function']),
    contactEmail: pickString(normalized, ['email', 'contactEmail', 'mail']),
    contactPhone: pickString(normalized, ['phone', 'contactPhone', 'telefone', 'cellphone']),
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

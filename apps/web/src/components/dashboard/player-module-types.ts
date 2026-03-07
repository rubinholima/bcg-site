/**
 * Tipos compartilhados entre a ficha do jogador e os módulos Médico / Psicologia.
 */

export interface MedicalProfile {
  bloodType?: string;
  allergies?: string;
  chronicDiseases?: string;
  medications?: string;
  otherConditions?: string;
}

export interface MedicalEntry {
  date?: string;
  type?: string;
  description?: string;
  daysOut?: number;
  gamesMissed?: number;
}

export function normalizeMedicalHistory(mh: unknown): { profile: MedicalProfile; records: MedicalEntry[] } {
  if (Array.isArray(mh)) {
    return { profile: {}, records: mh as MedicalEntry[] };
  }
  if (mh && typeof mh === "object" && "records" in mh) {
    const obj = mh as { profile?: MedicalProfile; records?: MedicalEntry[] };
    return {
      profile: obj.profile ?? {},
      records: Array.isArray(obj.records) ? obj.records : [],
    };
  }
  return { profile: {}, records: [] };
}

export interface PsychologicalAssessmentEntry {
  date?: string;
  evaluator?: string;
  dadosPessoais?: string;
  historicoEsportivo?: string;
  motivacaoObjetivos?: string;
  ansiedadeEstresse?: string;
  concentracaoFoco?: string;
  autoconfianca?: string;
  coping?: string;
  relacoesInterpessoais?: string;
  vidaForaEsporte?: string;
  qualidadeVida?: string;
  observacoes?: string;
}

export interface OnlineConsultation {
  date?: string;
  time?: string;
  type?: "meet";
  link?: string;
  notes?: string;
  status?: "scheduled" | "completed" | "cancelled";
}

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const PSYCH_FIELDS = [
  { key: "dadosPessoais", label: "Dados pessoais e contexto", placeholder: "Com quem mora, estado civil, filhos, escolaridade, profissão fora do esporte, rede de apoio familiar..." },
  { key: "historicoEsportivo", label: "Histórico esportivo", placeholder: "Anos praticando futebol, nível competitivo, lesões passadas, pausas na carreira, transições de clube..." },
  { key: "motivacaoObjetivos", label: "Motivação e objetivos", placeholder: "O que o leva a continuar, objetivos de curto e longo prazo, metas para a temporada..." },
  { key: "ansiedadeEstresse", label: "Ansiedade e estresse", placeholder: "Nível de ansiedade pré-jogo, situações estressantes, sintomas físicos/cognitivos, avaliação cognitiva da competição..." },
  { key: "concentracaoFoco", label: "Concentração e foco", placeholder: "Facilidade para manter o foco, situações de distração, rotinas pré-jogo..." },
  { key: "autoconfianca", label: "Autoconfiança", placeholder: "Nível geral de autoconfiança, variações em diferentes contextos (treino x jogo)..." },
  { key: "coping", label: "Estratégias de coping", placeholder: "Como lida com adversidades, pressão, derrotas; uso de coping ativo, evitativo..." },
  { key: "relacoesInterpessoais", label: "Relações interpessoais", placeholder: "Relação com comissão técnica, colegas de time, família em relação ao futebol..." },
  { key: "vidaForaEsporte", label: "Vida fora do esporte", placeholder: "Tempo livre, estudos, atividades, equilíbrio vida-treino..." },
  { key: "qualidadeVida", label: "Qualidade de vida e bem-estar", placeholder: "Percepção geral de bem-estar, sono, alimentação, descanso..." },
  { key: "observacoes", label: "Observações gerais", placeholder: "Outras informações relevantes da anamnese..." },
] as const;

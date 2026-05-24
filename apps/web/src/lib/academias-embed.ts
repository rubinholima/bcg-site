/** URLs públicas do app Academias (embed no dashboard BCG). */
export const ACADEMIAS_EMBED_URLS = {
  gestao: "https://academias.bostoncitygroup.biz",
  portal: "https://aluno.bostoncitygroup.biz",
} as const;

export type AcademiasEmbedKey = keyof typeof ACADEMIAS_EMBED_URLS;

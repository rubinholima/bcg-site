export function basenameWithoutExtension(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? filename;
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return base.trim() || 'Documento';
  return base.slice(0, dot).trim() || 'Documento';
}

/** Tenta mapear o nome do arquivo a um tipo conhecido; senão usa slug derivado do nome. */
export function inferDocumentTypeFromFilename(filename: string): string {
  const stem = basenameWithoutExtension(filename)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const tokens = new Set(stem.split(/[^a-z0-9]+/).filter(Boolean));
  if (tokens.has('rg') || stem.includes('identidade')) return 'rg';
  if (tokens.has('cpf')) return 'cpf';
  if (tokens.has('ctps')) return 'ctps';

  const rules: [RegExp, string][] = [
    [/certidao/, 'certidao'],
    [/comprovante.*resid/, 'comprovante_residencia'],
    [/passaporte|passport/, 'passaporte'],
    [/\bvisto\b/, 'visto'],
    [/\bbid\b|^bid[^a-z0-9]/, 'bid'],
    [/contrato/, 'contrato'],
    [/certificado.*medic|atestado/, 'certificado_medico'],
    [/matricula/, 'comprovante_matricula'],
    [/boletim/, 'boletim_escolar'],
    [/frequencia/, 'frequencia_escolar'],
    [/dispensa/, 'dispensa_escolar'],
    [/termo.*respons/, 'termo_responsabilidade'],
    [/exame|laudo|fisio/, 'exame'],
  ];
  for (const [re, type] of rules) {
    if (re.test(stem)) return type;
  }

  const slug = stem.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 80);
  return slug || 'outro';
}

export function registrationDocumentCategory(
  documentType: string,
): 'pessoal' | 'contrato' | 'medico' | 'outro' {
  const t = documentType.trim().toLowerCase();
  if (['exame_fisio', 'laudo', 'exame', 'certificado_medico'].includes(t)) return 'medico';
  if (['contrato', 'bid', 'documento_esportivo'].includes(t)) return 'contrato';
  if (
    [
      'rg',
      'cpf',
      'ctps',
      'certidao',
      'comprovante_residencia',
      'passaporte',
      'visto',
      'comprovante_matricula',
      'boletim_escolar',
      'frequencia_escolar',
      'dispensa_escolar',
      'termo_responsabilidade',
    ].includes(t)
  ) {
    return 'pessoal';
  }
  return 'outro';
}

export function resolveRegistrationDocumentMeta(
  fileOriginalName: string,
  name?: string | null,
  documentType?: string | null,
): { name: string; documentType: string; documentCategory: ReturnType<typeof registrationDocumentCategory> } {
  const resolvedName =
    name?.trim() || basenameWithoutExtension(fileOriginalName) || 'Documento';
  const resolvedType =
    documentType?.trim() || inferDocumentTypeFromFilename(fileOriginalName);
  return {
    name: resolvedName,
    documentType: resolvedType,
    documentCategory: registrationDocumentCategory(resolvedType),
  };
}

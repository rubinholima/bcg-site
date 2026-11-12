import {
  basenameWithoutExtension,
  inferDocumentTypeFromFilename,
  resolveRegistrationDocumentMeta,
} from './player-registration-document.util';

describe('player-registration-document.util', () => {
  it('basenameWithoutExtension', () => {
    expect(basenameWithoutExtension('RG Scan.pdf')).toBe('RG Scan');
    expect(basenameWithoutExtension('pasta/CPF João.jpg')).toBe('CPF João');
  });

  it('inferDocumentTypeFromFilename mapeia palavras-chave', () => {
    expect(inferDocumentTypeFromFilename('RG_frente.pdf')).toBe('rg');
    expect(inferDocumentTypeFromFilename('comprovante-residencia-2024.pdf')).toBe(
      'comprovante_residencia',
    );
  });

  it('resolveRegistrationDocumentMeta usa nome do arquivo sem tipo explícito', () => {
    const meta = resolveRegistrationDocumentMeta('Contrato 2025.pdf', '', '');
    expect(meta.name).toBe('Contrato 2025');
    expect(meta.documentType).toBe('contrato');
    expect(meta.documentCategory).toBe('contrato');
  });
});

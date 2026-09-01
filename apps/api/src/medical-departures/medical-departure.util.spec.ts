import {
  inferInitialDepartureStatus,
  normalizeReturnedAtForStatus,
} from './medical-departure-status.util';
import { normalizeDocumentIds, resolveDepartureDocuments } from './medical-departure-documents.util';

describe('medical-departure-status.util', () => {
  it('infere programada para saída futura', () => {
    const future = new Date(Date.now() + 60_000);
    expect(inferInitialDepartureStatus(future)).toBe('programada');
  });

  it('infere em_atendimento para saída passada/atual', () => {
    const past = new Date(Date.now() - 60_000);
    expect(inferInitialDepartureStatus(past)).toBe('em_atendimento');
  });

  it('normaliza returnedAt apenas quando status retornou', () => {
    const dt = new Date('2026-09-01T18:00:00Z');
    expect(normalizeReturnedAtForStatus('retornou', dt)?.toISOString()).toBe(dt.toISOString());
    expect(normalizeReturnedAtForStatus('em_atendimento', dt)).toBeNull();
  });
});

describe('medical-departure-documents.util', () => {
  it('resolve documentos pelo id no registrationProfile', () => {
    const profile = {
      documents: [
        { id: 'a1', name: 'Atestado', documentType: 'atestado_saida_ct', fileUrl: '/x.pdf' },
        { id: 'a2', name: 'Exame', documentType: 'exame_saida_ct', fileUrl: '/y.pdf' },
      ],
    };
    const docs = resolveDepartureDocuments(profile, ['a2', 'missing']);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.id).toBe('a2');
  });

  it('deduplica documentIds', () => {
    expect(normalizeDocumentIds(['x', 'x', '', 1])).toEqual(['x']);
  });
});

import {
  buildOperationalSchedulerNotification,
  resolveCaptacaoManagerEmail,
  resolveCaptacaoOperationalWhatsAppPhone,
  CAPTACAO_MANAGER_EMAIL_DEFAULT,
} from './captacao-notify.util';

describe('captacao-notify.util', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it('resolveCaptacaoManagerEmail usa gerente@bostoncityfc.com por padrão', () => {
    delete process.env.CAPTACAO_MANAGER_EMAIL;
    expect(resolveCaptacaoManagerEmail()).toBe(CAPTACAO_MANAGER_EMAIL_DEFAULT);
    expect(resolveCaptacaoManagerEmail()).toBe('gerente@bostoncityfc.com');
  });

  it('resolveCaptacaoManagerEmail respeita CAPTACAO_MANAGER_EMAIL', () => {
    process.env.CAPTACAO_MANAGER_EMAIL = ' outro@exemplo.com ';
    expect(resolveCaptacaoManagerEmail()).toBe('outro@exemplo.com');
  });

  it('resolveCaptacaoOperationalWhatsAppPhone usa +55 33 98413-3636', () => {
    delete process.env.CAPTACAO_SCHEDULER_PHONE;
    expect(resolveCaptacaoOperationalWhatsAppPhone()).toBe('33984133636');
  });

  it('buildOperationalSchedulerNotification não usa agentPhone como destino', () => {
    const result = buildOperationalSchedulerNotification({
      prospect: {
        name: 'Atleta Teste',
        agentPhone: '659992101879',
        evaluationOutcome: 'para_teste',
      },
      prospectId: 'p1',
    });
    expect(result.agentPhone).toBe('659992101879');
    expect(result.phone).toBe('33984133636');
    expect(result.whatsappUrl).toContain('wa.me/5533984133636');
    expect(result.whatsappUrl).not.toContain('9992101879');
  });
});

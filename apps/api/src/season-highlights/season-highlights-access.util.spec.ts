import { canAccessSeasonHighlights } from './season-highlights-access.util';

describe('canAccessSeasonHighlights', () => {
  it('libera admins', () => {
    expect(canAccessSeasonHighlights('super_admin', [])).toBe(true);
    expect(canAccessSeasonHighlights('company_admin', [])).toBe(true);
  });

  it('libera gerente/gestor com módulo futebol', () => {
    expect(canAccessSeasonHighlights('gerente', ['futebol_logistica'])).toBe(true);
    expect(canAccessSeasonHighlights('gestor', ['relatorios_futebol'])).toBe(true);
  });

  it('libera treinador com futebol_treinadores', () => {
    expect(canAccessSeasonHighlights('treinador', ['futebol_treinadores'])).toBe(true);
  });

  it('nega treinador sem módulo e diretoria isolada', () => {
    expect(canAccessSeasonHighlights('treinador', ['futebol_logistica'])).toBe(false);
    expect(canAccessSeasonHighlights('diretoria', ['diretoria'])).toBe(false);
  });
});

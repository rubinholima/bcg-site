import { SetMetadata } from '@nestjs/common';

export const REQUIRED_MODULE_KEY = 'requiredModule';
export const TEAM_REPORT_READ_KEY = 'teamReportRead';
export const SEASON_HIGHLIGHTS_ACCESS_KEY = 'seasonHighlightsAccess';

/** Exige acesso a um módulo (ou a qualquer um da lista). Use com ModuleAccessGuard. */
export const RequireModule = (slug: string | string[]) => SetMetadata(REQUIRED_MODULE_KEY, slug);

/** Leitura de relatórios da equipe: treinadores, diretoria, relatórios futebol, company_admin. */
export const TeamReportReadAccess = () => SetMetadata(TEAM_REPORT_READ_KEY, true);

/** Melhores da Temporada: admins, gerente/gestor/supervisor e treinadores (com módulo). */
export const SeasonHighlightsAccess = () => SetMetadata(SEASON_HIGHLIGHTS_ACCESS_KEY, true);

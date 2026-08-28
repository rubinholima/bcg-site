import { parseFmfMatchReportText } from './fmf-match-report.parser';
import { buildOfficialEventDrafts, syncMatchOfficialEvents } from './match-official-events.sync';
import { buildPlayerLinkPool } from './match-official-event.identity';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RUN_DB = process.env.DATABASE_URL?.includes('localhost');

describe('substituições INT (intervalo)', () => {
  it('parseia INT conforme legenda FMF e gera evento oficial', () => {
    const text = `
Competição: TEST Fase: X Rodada: 1
Jogo: MANDANTE X BOSTON CITY FUTEBOL CLUBE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
0 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:52
Início do 2º Tempo: 16:07
Término do 2º Tempo: 16:59
Relação de Jogadores
Nº Apelido Nome Completo CBF
1 Home Home Um 100
Nº Apelido Nome Completo CBF
8 Titular Titular Oito 800
17 Reserva Reserva Dezessete 1700
Árbitro Principal
Substituições
INT BOSTON CITY FUTEBOL CLUBE SAF 17 - Reserva Dezessete 8 - Titular Oito
ANT = Antes do Início do Jogo | INT = Intervalo | TER = Após o Término do Jogo
Cartões Amarelos
Cartões Vermelhos
Gols
`;
    const parsed = parseFmfMatchReportText(text);
    const intSub = parsed.substitutionEvents.find((s) => s.sourceTimingMarker === 'INT');
    expect(intSub).toBeTruthy();
    expect(intSub?.clock).toBe('INT');
    expect(intSub?.period).toBe('INT');
    expect(intSub?.inJerseyNumber).toBe(17);
    expect(intSub?.outJerseyNumber).toBe(8);

    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: buildPlayerLinkPool([]),
      staffPool: [],
    });
    expect(drafts.some((d) => d.factType === 'PLAYER_SUBSTITUTION' && d.sourceClock === 'INT')).toBe(
      true,
    );
  });
});

(RUN_DB ? describe : describe.skip)('corrected-source V1/V2 (DB)', () => {
  let tenantId: string;
  let reportId: string;

  beforeAll(async () => {
    const kind = await prisma.tenantKind.findFirst({ select: { id: true } });
    if (!kind) throw new Error('TenantKind ausente');
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Closure V1V2',
        slug: `closure-v1v2-${Date.now()}`,
        kindId: kind.id,
      },
    });
    tenantId = tenant.id;
    const report = await prisma.fmfMatchReport.create({
      data: {
        tenantId,
        externalMatchId: `closure-v1v2-${Date.now()}`,
        sourceUrl: 'https://local/v1v2',
        competition: 'TEST',
        category: 'sub20',
        season: 2026,
        matchDate: new Date('2026-08-01'),
        homeTeam: 'HOME',
        awayTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
      },
    });
    reportId = report.id;
  });

  afterAll(async () => {
    await prisma.matchOfficialEvent.deleteMany({ where: { tenantId } });
    await prisma.fmfMatchReport.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('V2 substitui V1 sem evento stale duplicado', async () => {
    const v1 = parseFmfMatchReportText(`
Competição: T Fase: X Rodada: 1
Jogo: MANDANTE X BOSTON CITY FUTEBOL CLUBE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
0 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45
Relação de Jogadores
Nº Apelido Nome Completo CBF
1 Home Home Um 100
Nº Apelido Nome Completo CBF
10 Joao Joao Silva 111
Árbitro Principal
Cartões Amarelos
32:00 2T 10 Joao Silva
- falta;
BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
Substituições
`);
    const v2 = parseFmfMatchReportText(`
Competição: T Fase: X Rodada: 1
Jogo: MANDANTE X BOSTON CITY FUTEBOL CLUBE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
0 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45
Relação de Jogadores
Nº Apelido Nome Completo CBF
1 Home Home Um 100
Nº Apelido Nome Completo CBF
10 Pedro Pedro Santos 222
Árbitro Principal
Cartões Amarelos
32:00 2T 10 Pedro Santos
- falta;
BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
Substituições
`);
    const pool = buildPlayerLinkPool([]);
    await syncMatchOfficialEvents(prisma as never, {
      tenantId,
      matchId: reportId,
      parsed: v1,
      ourTeamSide: 'away',
      players: pool.players,
      staff: [],
      parseSucceeded: true,
    });
    const afterV1 = await prisma.matchOfficialEvent.findMany({ where: { fmfMatchReportId: reportId } });
    expect(afterV1).toHaveLength(1);
    const joaoKey = afterV1[0]!.externalKey;

    await syncMatchOfficialEvents(prisma as never, {
      tenantId,
      matchId: reportId,
      parsed: v2,
      ourTeamSide: 'away',
      players: pool.players,
      staff: [],
      parseSucceeded: true,
    });
    const afterV2 = await prisma.matchOfficialEvent.findMany({ where: { fmfMatchReportId: reportId } });
    expect(afterV2).toHaveLength(1);
    expect(afterV2[0]!.id).toBe(afterV1[0]!.id);
    expect(afterV2[0]!.externalKey).toBe(joaoKey);

    const v3 = parseFmfMatchReportText(`
Competição: T Fase: X Rodada: 1
Jogo: MANDANTE X BOSTON CITY FUTEBOL CLUBE SAF
Data: 01/08/2026 Hora: 15:00
Resultado do Jogo
0 x 0
Arbitragem
Início do 1º Tempo: 15:00
Término do 1º Tempo: 15:45
Início do 2º Tempo: 16:00
Término do 2º Tempo: 16:45
Relação de Jogadores
Nº Apelido Nome Completo CBF
1 Home Home Um 100
Nº Apelido Nome Completo CBF
10 Pedro Pedro Santos 222
Árbitro Principal
Cartões Amarelos
35:00 2T 10 Pedro Santos
- falta;
BOSTON CITY FUTEBOL CLUBE SAF
Cartões Vermelhos
Substituições
`);
    await syncMatchOfficialEvents(prisma as never, {
      tenantId,
      matchId: reportId,
      parsed: v3,
      ourTeamSide: 'away',
      players: pool.players,
      staff: [],
      parseSucceeded: true,
    });
    const afterV3 = await prisma.matchOfficialEvent.findMany({ where: { fmfMatchReportId: reportId } });
    expect(afterV3).toHaveLength(1);
    expect(afterV3[0]!.externalKey).not.toBe(joaoKey);
    expect(await prisma.matchOfficialEvent.findFirst({
      where: { fmfMatchReportId: reportId, externalKey: joaoKey },
    })).toBeNull();
  });
});

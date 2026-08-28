import { PrismaClient } from '@prisma/client';
import { parseFmfMatchReportText } from './fmf-match-report.parser';
import { syncMatchOfficialEvents } from './match-official-events.sync';
import { buildPlayerLinkPool } from './match-official-event.identity';
import { projectPlayerStatsFromOfficialFacts } from './fmf-player-stat.projection';
import { buildOfficialEventDrafts } from './match-official-events.sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const RUN_DB = process.env.DATABASE_URL?.includes('localhost');

(RUN_DB ? describe : describe.skip)('MatchOfficialEvent DB integration (dev)', () => {
  let tenantId: string;
  let reportId: string;
  let playerId: string;

  beforeAll(async () => {
    const kind = await prisma.tenantKind.findFirst({ select: { id: true } });
    if (!kind) throw new Error('TenantKind ausente');
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Jest Phase3 DB',
        slug: `jest-p3-${Date.now()}`,
        kindId: kind.id,
      },
    });
    tenantId = tenant.id;
    const player = await prisma.player.create({
      data: {
        tenantId,
        name: 'William Lopes De Souza',
        category: 'sub20',
        cbfRegistration: '738626',
      },
    });
    playerId = player.id;
    const report = await prisma.fmfMatchReport.create({
      data: {
        tenantId,
        externalMatchId: `jest-45789-${Date.now()}`,
        sourceUrl: 'https://local/golden',
        competition: 'SUB 20',
        category: 'sub20',
        season: 2026,
        matchDate: new Date('2026-08-01'),
        homeTeam: 'NACIONAL',
        awayTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
        homeScore: 1,
        awayScore: 1,
      },
    });
    reportId = report.id;
  });

  afterAll(async () => {
    await prisma.matchOfficialEvent.deleteMany({ where: { tenantId } });
    await prisma.fmfMatchReport.deleteMany({ where: { tenantId } });
    await prisma.player.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('unique (fmfMatchReportId, externalKey) bloqueia duplicata', async () => {
    const key = 'fmf:test:unique:1';
    await prisma.matchOfficialEvent.create({
      data: {
        tenantId,
        fmfMatchReportId: reportId,
        factType: 'PLAYER_YELLOW_CARD',
        resolutionStatus: 'unresolved',
        externalKey: key,
      },
    });
    await expect(
      prisma.matchOfficialEvent.create({
        data: {
          tenantId,
          fmfMatchReportId: reportId,
          factType: 'PLAYER_YELLOW_CARD',
          resolutionStatus: 'unresolved',
          externalKey: key,
        },
      }),
    ).rejects.toThrow();
  });

  it('sync golden + reimport mantém IDs', async () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'fixtures/golden-match-45789.source.txt'),
      'utf8',
    );
    const parsed = parseFmfMatchReportText(source);
    const pool = buildPlayerLinkPool([
      { id: playerId, name: 'William', cbfRegistration: '738626' },
    ]);
    await syncMatchOfficialEvents(prisma as never, {
      tenantId,
      matchId: reportId,
      parsed,
      ourTeamSide: 'away',
      players: pool.players,
      staff: [],
      parseSucceeded: true,
    });
    const first = await prisma.matchOfficialEvent.findMany({
      where: { fmfMatchReportId: reportId },
      orderBy: { sourceSequence: 'asc' },
    });
    await syncMatchOfficialEvents(prisma as never, {
      tenantId,
      matchId: reportId,
      parsed,
      ourTeamSide: 'away',
      players: pool.players,
      staff: [],
      parseSucceeded: true,
    });
    const second = await prisma.matchOfficialEvent.findMany({
      where: { fmfMatchReportId: reportId },
      orderBy: { sourceSequence: 'asc' },
    });
    expect(second.length).toBe(first.length);
    expect(second.map((e) => e.id)).toEqual(first.map((e) => e.id));
  });

  it('unresolved → resolved ao vincular CBF', async () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'fixtures/golden-match-45789.source.txt'),
      'utf8',
    );
    const parsed = parseFmfMatchReportText(source);
    const joao = await prisma.player.create({
      data: {
        tenantId,
        name: 'Joao Victor',
        category: 'sub20',
        cbfRegistration: '776375',
      },
    });
    const pool = buildPlayerLinkPool([
      { id: playerId, name: 'William', cbfRegistration: '738626' },
      { id: joao.id, name: 'Joao Victor', cbfRegistration: '776375' },
    ]);
    await syncMatchOfficialEvents(prisma as never, {
      tenantId,
      matchId: reportId,
      parsed,
      ourTeamSide: 'away',
      players: pool.players,
      staff: [],
      parseSucceeded: true,
    });
    const joaoCard = await prisma.matchOfficialEvent.findFirst({
      where: {
        fmfMatchReportId: reportId,
        sourceJerseyNumber: 4,
        factType: 'PLAYER_YELLOW_CARD',
      },
    });
    expect(joaoCard?.playerId).toBe(joao.id);
    expect(joaoCard?.resolutionStatus).toBe('resolved');
  });

  it('projeção reproduz gol William quando resolvido', async () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'fixtures/golden-match-45789.source.txt'),
      'utf8',
    );
    const parsed = parseFmfMatchReportText(source);
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: buildPlayerLinkPool([
        { id: playerId, name: 'William', cbfRegistration: '738626' },
      ]),
      staffPool: [],
    });
    const projected = projectPlayerStatsFromOfficialFacts({
      roster: parsed.roster,
      ourTeamSide: 'away',
      totalMinutes: parsed.totalMinutes,
      firstHalfMinutes: parsed.firstHalfMinutes ?? 45,
      events: drafts.map((d) => ({
        ...d,
        playerId: d.sourceJerseyNumber === 9 ? playerId : d.playerId,
        resolutionStatus: d.sourceJerseyNumber === 9 ? 'resolved' : d.resolutionStatus,
      })),
    });
    expect(projected.find((s) => s.cbfRegistration === '738626')?.goals).toBe(1);
  });
});

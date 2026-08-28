import * as fs from 'fs';
import * as path from 'path';
import { parseFmfMatchReportText } from '../fmf-scraper/fmf-match-report.parser';
import { buildOfficialEventDrafts } from '../fmf-scraper/match-official-events.sync';
import { buildPlayerLinkPool } from '../fmf-scraper/match-official-event.identity';
import {
  buildOfficialSheet,
  formatOfficialEventTiming,
  linkBadgeLabel,
} from './sumula-cartoes-events.builder';

const FIXTURES = path.join(__dirname, '../fmf-scraper/fixtures');

describe('sumula-cartoes-events.builder', () => {
  const sourceText = fs.readFileSync(
    path.join(FIXTURES, 'golden-match-45789.source.txt'),
    'utf8',
  );
  const parsed = parseFmfMatchReportText(sourceText);
  const ourTeamSide = 'away' as const;
  const emptyPool = buildPlayerLinkPool([]);

  it('INT renderiza como Intervalo', () => {
    expect(formatOfficialEventTiming('INT', 'INT')).toBe('Intervalo');
    expect(formatOfficialEventTiming('INT', '2T')).toBe('Intervalo');
  });

  it('official sheet preserva nome oficial sem Player.id', () => {
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
    });
    const persisted = drafts.map((d, i) => ({
      id: `e${i}`,
      factType: d.factType,
      playerId: d.playerId ?? null,
      technicalStaffId: d.technicalStaffId ?? null,
      resolutionStatus: d.resolutionStatus,
      relatedResolutionStatus: d.relatedResolutionStatus ?? null,
      sourceName: d.sourceName ?? null,
      sourceRegistration: d.sourceRegistration ?? null,
      sourceJerseyNumber: d.sourceJerseyNumber ?? null,
      relatedJerseyNumber: d.relatedJerseyNumber ?? null,
      relatedPlayerId: d.relatedPlayerId ?? null,
      sourceRoleLabel: d.sourceRoleLabel ?? null,
      sourceTeamSide: d.sourceTeamSide ?? null,
      minute: d.minute ?? null,
      period: d.period ?? null,
      sourceClock: d.sourceClock ?? null,
      sourceSequence: d.sourceSequence ?? i + 1,
      goalType: d.goalType ?? null,
      externalKey: d.externalKey,
    }));

    const sheet = buildOfficialSheet({
      parsed,
      events: persisted,
      integrityStatus: 'unresolved',
      playerPool: emptyPool,
      staffPool: [],
    });

    const awayCard = sheet.playerCards.find((c) => c.sourceJerseyNumber === 6);
    expect(awayCard?.sourceName).toContain('Higor');
    expect(awayCard?.playerId).toBeNull();
    expect(linkBadgeLabel(awayCard?.linkBadge)).toBe('Vínculo pendente');

    expect(sheet.roster.away.some((r) => r.sourceName.includes('Higor'))).toBe(true);
    expect(sheet.roster.away.every((r) => r.playerId == null)).toBe(true);
  });

  it('papel da comissão vem da fonte, não do cadastro', () => {
    const sheet = buildOfficialSheet({
      parsed,
      events: [],
      integrityStatus: 'warnings',
      playerPool: emptyPool,
      staffPool: [],
    });
    const awayStaff = sheet.staffRoster.away.find((s) =>
      s.sourceName.includes('Roberto Ismael'),
    );
    expect(awayStaff?.roleLabel).toMatch(/Auxiliar/i);
  });

  it('substituições INT aparecem com timing Intervalo', () => {
    const drafts = buildOfficialEventDrafts({
      parsed,
      ourTeamSide,
      playerPool: emptyPool,
      staffPool: [],
    });

    const persisted = drafts.map((d, i) => ({
      id: `e${i}`,
      factType: d.factType,
      playerId: d.playerId ?? null,
      technicalStaffId: d.technicalStaffId ?? null,
      resolutionStatus: d.resolutionStatus,
      relatedResolutionStatus: d.relatedResolutionStatus ?? null,
      sourceName: d.sourceName ?? null,
      sourceRegistration: d.sourceRegistration ?? null,
      sourceJerseyNumber: d.sourceJerseyNumber ?? null,
      relatedJerseyNumber: d.relatedJerseyNumber ?? null,
      relatedPlayerId: d.relatedPlayerId ?? null,
      sourceRoleLabel: d.sourceRoleLabel ?? null,
      sourceTeamSide: d.sourceTeamSide ?? null,
      minute: d.minute ?? null,
      period: d.period ?? null,
      sourceClock: d.sourceClock ?? null,
      sourceSequence: d.sourceSequence ?? i + 1,
      goalType: d.goalType ?? null,
      externalKey: d.externalKey,
    }));

    const sheet = buildOfficialSheet({
      parsed,
      events: persisted,
      integrityStatus: 'unresolved',
      playerPool: emptyPool,
      staffPool: [],
    });

    const intRow = sheet.substitutions.find((s) => s.sourceClock === 'INT');
    expect(intRow?.timingLabel).toBe('Intervalo');
  });
});

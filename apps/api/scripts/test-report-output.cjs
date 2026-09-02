/* Run from apps/api: node scripts/test-report-output.cjs
 * Synthetic fixtures only. Exercises actual generators and Chromium PDF pagination.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = process.env.REPORT_TEST_ROOT || path.resolve(__dirname, '../../..');
const req = id => require(require.resolve(id, { paths: [root + '/apps/api', root + '/apps/web'] }));
const ts = req('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, parent, ...rest) {
  return resolve.call(this, id.startsWith('@/') ? root + '/apps/web/src/' + id.slice(2) : id, parent, ...rest);
};
require.extensions['.ts'] = (mod, file) => {
  mod.paths.push(root + '/apps/api/node_modules', root + '/apps/web/node_modules');
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, esModuleInterop: true,
  } }).outputText, file);
};
const engine = require(root + '/apps/web/src/lib/report-print-engine.ts');
const layout = require(root + '/apps/web/src/lib/report-print-layout.ts');
const { buildPlayerDossierPrintHtml } = require(root + '/apps/web/src/lib/player-dossier-print.ts');
const { reportTrend, reportRadar } = require(root + '/apps/web/src/lib/report-charts.ts');
const { PDFDocument } = req('pdf-lib');
const { PDFParse } = req('pdf-parse');

function fixture() {
  const optional = {
    psychology: { consultations: [{ date: '2026-08-01', type: 'Consulta', notes: 'PRIVATE_psychology_END' }] },
    physio: { sessions: [{ startedAt: '2026-08-01', status: 'completed', diagnosisLabel: 'PRIVATE_physio_END' }] },
    nursing: { sessions: [{ attendedAt: '2026-08-01', symptoms: 'PRIVATE_nursing_END' }] },
    medical: { departures: [{ departedAt: '2026-08-01', reason: 'PRIVATE_medical_END' }] },
    nutrition: { assessments: [{ assessedAt: '2026-08-01', weightKg: 70, notes: 'PRIVATE_nutrition_END' }] },
    physiology: { records: [{ date: '2026-08-01', weight: 70 }, { date: '2026-08-10', weight: 71, notes: 'PRIVATE_physiology_END' }] },
    performanceDetail: { performanceAnalysis: 'PRIVATE_performance_END', analysisMetrics: {} },
    scouting: { prospects: [{ strengths: 'PRIVATE_scouting_END', reports: [] }] },
    training: { sessions: [{ sessionDate: '2026-08-01', notes: 'PRIVATE_training_END' }] },
  };
  return {
    meta: { generatedAt: '2026-09-02T12:00:00Z', includedOptionalSections: [], availableOptionalSections: [] },
    cover: { name: 'Atleta de teste', height: 178, weight: 71 }, club: null,
    snapshot: {}, profile: {}, sportingStory: [], highlights: [], timeline: [], optional,
    performance: { coachEvaluations: [], coachSummary: {}, diretoriaEvaluations: [], analysisMetrics: {} },
    matchHistory: { totals: null, matches: [], bySeason: [] },
    charts: { monthlyMinutes: [], monthlyGoals: [], monthlyAppearances: [], seasonMinutes: [], evaluationTrend: [] },
  };
}

async function run() {
  const { PlayerDossierService } = require(root + '/apps/api/src/cadastros/player-dossier.service.ts');
  const privatePlayer = { id: 'test', tenantId: 'tenant', name: 'Test', bmi: 23, bodyFatPercent: 12,
    evaluations: [{ date: '2026-08-01', notes: 'PRIVATE_API' }], analysisMetrics: { confidential: 4 }, performanceAnalysis: 'PRIVATE_API' };
  const service = new PlayerDossierService({ coachPlayerEvaluation: { findMany: async () => [] } },
    { findOne: async () => privatePlayer, findSubidaHistory: async () => [] },
    { getPlayerStats: async () => null }, { getSlugsForActor: async () => [] });
  const request = { playerId: 'test', allowedTenantIds: ['tenant'], actorSub: 'test', role: 'super_admin' };
  const external = await service.buildDossier({ ...request, optionalSectionsRaw: '' });
  assert.equal(JSON.stringify(external).includes('PRIVATE_API'), false);
  assert.deepEqual(external.performance.analysisMetrics, {});
  assert.equal(external.profile.bodyFatPercent, null);
  const internal = await service.buildDossier({ ...request, optionalSectionsRaw: 'performance' });
  assert.equal(internal.performance.performanceAnalysis, 'PRIVATE_API');
  assert.equal(reportRadar('Missing', [{ label: 'A', value: 3 }], 5), '');
  assert.equal(reportTrend('Missing', 'kg', [{ date: '2026-08-01', value: 70 }]), '');
  assert.ok(reportTrend('Weight', 'kg', [{ date: '2026-08-10', value: 71 }, { date: '2026-08-01', value: 70 }]).includes('70 → 71'));
  const ids = ['psychology', 'physio', 'nursing', 'medical', 'nutrition', 'physiology', 'performance', 'scouting', 'training'];
  for (const id of ids) {
    const d = fixture(); d.meta.includedOptionalSections = [id];
    const html = buildPlayerDossierPrintHtml(d);
    for (const other of ids) assert.equal(html.includes('PRIVATE_' + other + '_END'), id === other, `selection ${id}/${other}`);
  }
  const legacy = layout.ReportLegacyDocument('<html><head><title>A &amp; B</title><style>@page {size:Letter landscape;margin:.5in} @page :first{margin:0}</style></head><body>Body</body></html>');
  assert.ok(legacy.includes('margin: 12.7mm 12.7mm 12.7mm 12.7mm'));
  assert.ok(legacy.includes('@page :first { margin: 0mm 0mm 0mm 0mm; }'));
  // Do not allow a new report generator to bypass the central physical layout.
  for (const name of fs.readdirSync(root + '/apps/web/src/lib').filter(n => n.endsWith('.ts') && n !== 'report-print-engine.ts')) {
    const source = fs.readFileSync(root + '/apps/web/src/lib/' + name, 'utf8');
    assert.ok(!/return\s+`<!DOCTYPE html>/i.test(source), `Uncentralized report: ${name}`);
  }
  const { chromium } = req('playwright');
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : process.platform === 'win32' ? { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : {}) });
  try {
    for (const paperSize of ['A4', 'Letter']) for (const orientation of ['portrait', 'landscape']) {
      const config = { paperSize, orientation, margins: { top: 12, right: 11, bottom: 14, left: 11 } };
      const page = await browser.newPage();
      await page.route('**/*', r => r.fulfill({ body: fs.readFileSync(root + '/apps/web/public/cup360-logo.png'), contentType: 'image/png' }));
      const html = layout.wrapPrintRootDocument({ title: 'Physical pagination', config, styles: layout.REPORT_PRINT_BREAK_CSS,
        headerHtml: 'HEADER', footerHtml: 'FOOTER', bodyHtml: ['Alpha', 'Beta', 'Gamma'].map(t => engine.ReportPage(t, { explicit: true })).join('') });
      await page.setContent(html.replace('<head>', '<head><base href="http://report.test/">'));
      let pdf = await page.pdf({ preferCSSPageSize: true });
      let parsed = new PDFParse({ data: pdf });
      let text = await parsed.getText();
      assert.equal(text.pages.length, 3, 'Repeated headers/footers must not create ghost pages');
      for (const [i, token] of ['Alpha', 'Beta', 'Gamma'].entries()) assert.ok(text.pages[i].text.includes(token));
      await parsed.destroy();
      for (const selection of [ids, ['physiology', 'training'], []]) {
        const d = fixture(); d.meta.includedOptionalSections = selection;
        await page.setContent(buildPlayerDossierPrintHtml(d, config).replace('<head>', '<head><base href="http://report.test/">'));
        pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
        const doc = await PDFDocument.load(pdf);
        assert.equal(doc.getTitle(), 'Dossiê - Atleta de teste');
        const metrics = engine.getReportPageMetrics(config), size = doc.getPage(0).getSize();
        assert.ok(Math.abs(size.width - metrics.paperWidth * 72 / 25.4) < 1);
        assert.ok(Math.abs(size.height - metrics.paperHeight * 72 / 25.4) < 1);
        parsed = new PDFParse({ data: pdf }); text = await parsed.getText();
        for (const token of selection) assert.ok(text.text.includes('PRIVATE_' + token + '_END'));
        for (const token of ids.filter(id => !selection.includes(id))) assert.ok(!text.text.includes('PRIVATE_' + token + '_END'));
        await parsed.destroy();
      }
      // Check the iframe print lifecycle including top-level filename and cancellation restoration.
      await page.setContent('<title>Dashboard</title>');
      await page.evaluate(async (source) => {
        let called = false;
        const create = document.createElement.bind(document); document.createElement = function(name) { const el = create(name); if(name === 'iframe') el.addEventListener('load', () => { el.contentWindow.print = () => {
          if (document.title !== 'Dossiê - Teste') throw Error('Wrong top-level title');
          called = true; el.contentWindow.dispatchEvent(new Event('afterprint'));
        }; }); return el; };
        const print = (0, eval)('(' + source + ')');
        print('<html><head><title>Dossiê - Teste</title></head><body>Ready</body></html>');
        await new Promise((resolve, reject) => {const check = () => called ? resolve() : setTimeout(check, 10);check();setTimeout(() => reject(Error('Print was not called')), 5000);});
        if (document.title !== 'Dashboard' || document.querySelector('iframe')) throw Error('Print cleanup failed');
      }, engine.printReportDocument.toString());
      await page.close();
    }
  } finally { await browser.close(); }
  console.log('PASS: 9 optional sections, 12 dossier PDFs, physical sizes, ghost-page regression, metadata, charts and iframe lifecycle');
}
run().catch(error => { console.error(error); process.exitCode = 1; });



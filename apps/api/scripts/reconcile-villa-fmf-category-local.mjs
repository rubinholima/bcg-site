/**
 * Reconciliação LOCAL — categorias operacionais + externalId estável FMF.
 * Uso:
 *   node scripts/reconcile-villa-fmf-category-local.mjs          # só relatório
 *   node scripts/reconcile-villa-fmf-category-local.mjs --apply  # aplica
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');
const p = new PrismaClient();

function toOperationalCategory(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return '';
  if (key.endsWith('_2div')) return key.slice(0, -'_2div'.length);
  return key;
}

function normOpponent(name) {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function travelGroupKey(t) {
  const d = t.matchDate.toISOString().slice(0, 10);
  return `${d}|${normOpponent(t.opponentName)}|${toOperationalCategory(t.category)}`;
}

function scoreTravel(t) {
  let s = 0;
  s += (t._count?.participants ?? 0) * 10;
  if (t.externalId?.startsWith('fmf-travel-d')) s += 200;
  else if (t.externalId?.startsWith('fmf-travel')) s += 100;
  if (t.status && t.status !== 'rascunho' && t.status !== 'cancelado') s += 25;
  s += new Date(t.updatedAt).getTime() / 1e15;
  return s;
}

async function main() {
  const villa = await p.tenant.findUnique({
    where: { slug: 'villa-nova-saf' },
    select: { id: true, name: true, categories: true },
  });
  if (!villa) throw new Error('Villa not found');

  const correctCategories = ['modulo_ii', 'sub20', 'sub15', 'sub13'];
  console.log('CURRENT tenant.categories', JSON.stringify(villa.categories));
  console.log('TARGET tenant.categories', JSON.stringify(correctCategories));

  const travels = await p.travelLogistics.findMany({
    where: { tenantId: villa.id, status: { not: 'cancelado' } },
    include: { _count: { select: { participants: true } } },
    orderBy: { matchDate: 'asc' },
  });

  const groups = new Map();
  for (const t of travels) {
    const key = travelGroupKey(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const duplicateGroups = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  console.log('\nDUPLICATE GROUPS', duplicateGroups.length);
  for (const [key, rows] of duplicateGroups) {
    const sorted = [...rows].sort((a, b) => scoreTravel(b) - scoreTravel(a));
    const keep = sorted[0];
    const drop = sorted.slice(1);
    console.log('\nGROUP', key);
    console.log(' KEEP', keep.id, keep.externalId, keep.category, keep.championshipName);
    for (const d of drop) {
      console.log(' DROP', d.id, d.externalId, d.category, d.championshipName);
    }
  }

  const categoryUpdates = travels.filter(
    (t) => t.category && toOperationalCategory(t.category) !== t.category,
  );
  console.log('\nTRAVEL category updates', categoryUpdates.length);
  for (const t of categoryUpdates.slice(0, 10)) {
    console.log(' ', t.id, t.category, '->', toOperationalCategory(t.category));
  }

  const agenda = await p.footballAgendaEntry.findMany({
    where: { tenantId: villa.id, externalId: { startsWith: 'fmf-' } },
    select: { id: true, externalId: true, category: true, title: true },
  });
  const agendaUpdates = agenda.filter(
    (a) => a.category && toOperationalCategory(a.category) !== a.category,
  );
  console.log('\nAGENDA category updates', agendaUpdates.length);

  if (!APPLY) {
    console.log('\nDRY-RUN — use --apply para executar');
    await p.$disconnect();
    return;
  }

  await p.tenant.update({
    where: { id: villa.id },
    data: { categories: correctCategories },
  });

  for (const t of categoryUpdates) {
    await p.travelLogistics.update({
      where: { id: t.id },
      data: { category: toOperationalCategory(t.category) },
    });
  }

  for (const a of agendaUpdates) {
    await p.footballAgendaEntry.update({
      where: { id: a.id },
      data: { category: toOperationalCategory(a.category) },
    });
  }

  for (const [, rows] of duplicateGroups) {
    const sorted = [...rows].sort((a, b) => scoreTravel(b) - scoreTravel(a));
    const drop = sorted.slice(1);
    for (const d of drop) {
      if ((d._count?.participants ?? 0) > 0) {
        console.log('SKIP delete (has participants)', d.id);
        continue;
      }
      await p.travelLogistics.delete({ where: { id: d.id } });
      console.log('DELETED duplicate travel', d.id);
    }
  }

  console.log('\nAPPLY COMPLETE');
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});

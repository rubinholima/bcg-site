/**
 * Exporta catálogo Beatscode de roupas/kits + baixa imagens.
 * pnpm exec ts-node -r tsconfig-paths/register scripts/export-beatscode-clothing.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { chromium, type Page } from 'playwright';
import { BeatscodeApiClient } from '../src/beatscode-import/beatscode-api.client';
import { resolveBeatscodeWebUrl } from '../src/beatscode-import/beatscode-browser.util';

config({ path: path.join(__dirname, '..', '.env') });

const OUT = path.join(__dirname, '..', 'data', 'beatscode-clothing');
const FILES = path.join(OUT, 'files');

const ENDPOINTS: Array<{ key: string; path: string; route: string }> = [
  { key: 'clothing-groups', path: '/clothing-group', route: '/clothing-group' },
  { key: 'clothing-categories', path: '/clothing-category', route: '/clothing-category' },
  { key: 'clothing-types', path: '/clothing-type', route: '/clothing-type' },
  { key: 'clothing', path: '/clothing', route: '/clothing' },
  { key: 'uniform-types', path: '/uniform-type', route: '/uniform-type' },
  { key: 'uniforms', path: '/uniform', route: '/uniform' },
  { key: 'kits', path: '/kit', route: '/kit' },
  { key: 'apparel', path: '/apparel', route: '/apparel' },
  // alternate plurals / names
  { key: 'clothing-groups-alt', path: '/clothingGroup', route: '/clothing-group' },
  { key: 'clothing-categories-alt', path: '/clothingCategory', route: '/clothing-category' },
  { key: 'uniforms-alt', path: '/uniforms', route: '/uniform' },
  { key: 'kits-alt', path: '/kits', route: '/kit' },
];

function ensureDir(d: string) {
  fs.mkdirSync(d, { recursive: true });
}

function pickImagePath(row: Record<string, unknown>): string | null {
  const candidates = [
    row.image,
    row.imageUrl,
    row.photo,
    row.photoUrl,
    row.logo,
    row.file,
    row.picture,
    row.thumbnail,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>;
      const link = o.link ?? o.url ?? o.path ?? o.filename ?? o.name;
      if (typeof link === 'string' && link.trim()) return link.trim();
    }
  }
  return null;
}

async function downloadImages(
  client: BeatscodeApiClient,
  rows: Record<string, unknown>[],
  prefix: string,
) {
  const map: Record<string, string> = {};
  for (const row of rows) {
    const id = String(row.id ?? row.name ?? Math.random());
    const imgPath = pickImagePath(row);
    if (!imgPath) continue;
    try {
      const buf = await client.downloadFile(imgPath);
      if (!buf) continue;
      const ext = path.extname(imgPath.split('?')[0] || '') || '.png';
      const fileName = `${prefix}_${id}${ext}`.replace(/[^\w.-]+/g, '_');
      const dest = path.join(FILES, fileName);
      fs.writeFileSync(dest, buf);
      map[id] = `files/${fileName}`;
      console.log('img', fileName, buf.length);
    } catch (e) {
      console.log('img fail', id, e);
    }
  }
  return map;
}

async function exportViaApi(client: BeatscodeApiClient) {
  const catalog: Record<string, unknown> = {};
  for (const ep of ENDPOINTS) {
    try {
      const rows = await client.listByPath(ep.path, ep.route);
      catalog[ep.key] = rows;
      console.log('API', ep.key, rows.length, rows[0] ? Object.keys(rows[0]).slice(0, 12).join(',') : '');
      if (rows.length) {
        fs.writeFileSync(path.join(OUT, `api-${ep.key}.json`), JSON.stringify(rows, null, 2));
        const imgs = await downloadImages(client, rows, ep.key);
        if (Object.keys(imgs).length) {
          fs.writeFileSync(path.join(OUT, `imgs-map-${ep.key}.json`), JSON.stringify(imgs, null, 2));
        }
      }
    } catch (e) {
      console.log('API fail', ep.key, String(e).slice(0, 120));
    }
  }
  return catalog;
}

async function loginWeb(page: Page) {
  const web = resolveBeatscodeWebUrl();
  const user = process.env.BEATSCODE_USERNAME!.trim();
  const pass = process.env.BEATSCODE_PASSWORD!.trim();
  await page.goto(`${web}/signin`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pass);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => undefined),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await page.waitForTimeout(2500);
}

async function exportViaBrowser() {
  const web = resolveBeatscodeWebUrl();
  const browser = await chromium.launch({ headless: process.env.BEATSCODE_HEADED !== '1' });
  const page = await browser.newPage();
  const captured: Array<{ url: string; body: unknown }> = [];

  page.on('response', async (res) => {
    const url = res.url();
    if (!/bostoncityfc-api\.beatscode\.com/i.test(url)) return;
    if (!/(clothing|uniform|kit|apparel)/i.test(url)) return;
    if (/web-initial-data/i.test(url)) return;
    try {
      const body = await res.json();
      captured.push({ url, body });
      console.log('NET JSON', res.status(), url.replace(web, ''), Array.isArray(body) ? `arr ${body.length}` : typeof body);
    } catch {
      /* ignore */
    }
  });

  await loginWeb(page);

  const routes = [
    '/clothing-group',
    '/clothing-category',
    '/clothing',
    '/uniform-type',
    '/uniform',
    '/kit',
  ];

  for (const route of routes) {
    await page.goto(`${web}${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3500);
    // try click pagination / load more
    const next = page.locator('text=/página|page|próxim|next|>/i').first();
    if (await next.count()) {
      await next.click({ timeout: 1000 }).catch(() => undefined);
      await page.waitForTimeout(1500);
    }
    const safe = route.replace(/\W+/g, '_');
    await page.screenshot({ path: path.join(OUT, `full${safe}.png`), fullPage: true });

    // harvest img srcs that look like files/
    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('img'))
        .map((img) => img.src)
        .filter((s) => /files\/|beatscode|clothing|uniform|kit/i.test(s)),
    );
    fs.writeFileSync(path.join(OUT, `browser-imgs${safe}.json`), JSON.stringify(imgs, null, 2));
    console.log('browser', route, 'imgs', imgs.length);
  }

  fs.writeFileSync(path.join(OUT, 'browser-api-calls.json'), JSON.stringify(captured, null, 2));
  await browser.close();
  return captured;
}

async function main() {
  ensureDir(OUT);
  ensureDir(FILES);

  const client = new BeatscodeApiClient(
    process.env.BEATSCODE_API_URL!.trim(),
    process.env.BEATSCODE_USERNAME!.trim(),
    process.env.BEATSCODE_PASSWORD!.trim(),
  );
  await client.login();
  console.log('login ok');

  const catalog = await exportViaApi(client);
  fs.writeFileSync(path.join(OUT, 'catalog-api.json'), JSON.stringify(catalog, null, 2));

  const captured = await exportViaBrowser();

  // If browser captured list payloads, merge + download
  for (const item of captured) {
    const rows = Array.isArray(item.body)
      ? item.body
      : item.body && typeof item.body === 'object' && Array.isArray((item.body as { data?: unknown }).data)
        ? (item.body as { data: unknown[] }).data
        : null;
    if (!rows?.length) continue;
    const key = item.url.includes('clothing-group')
      ? 'clothing-groups'
      : item.url.includes('clothing-category')
        ? 'clothing-categories'
        : item.url.includes('clothing-type')
          ? 'clothing-types'
          : item.url.includes('clothing')
            ? 'clothing'
            : item.url.includes('uniform-type')
              ? 'uniform-types'
              : item.url.includes('uniform')
                ? 'uniforms'
                : item.url.includes('kit')
                  ? 'kits'
                  : 'other';
    fs.writeFileSync(path.join(OUT, `browser-${key}.json`), JSON.stringify(rows, null, 2));
    await downloadImages(client, rows as Record<string, unknown>[], `browser_${key}`);
  }

  console.log('done', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

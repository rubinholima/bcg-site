import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { BeatscodeApiClient } from '../src/beatscode-import/beatscode-api.client';

config({ path: path.join(__dirname, '..', '.env') });

const OUT = path.join(__dirname, '..', 'data', 'beatscode-clothing');
const FILES = path.join(OUT, 'files');

function pickImagePath(row: Record<string, unknown>): string | null {
  const candidates = [row.image, row.imageUrl, row.photo, row.logo, row.file, row.picture];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
    if (c && typeof c === 'object') {
      const o = c as Record<string, unknown>;
      const link = o.link ?? o.url ?? o.path ?? o.filename;
      if (typeof link === 'string' && link.trim()) return link.trim();
    }
  }
  // nested clothing.image
  if (row.clothing && typeof row.clothing === 'object') {
    return pickImagePath(row.clothing as Record<string, unknown>);
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
      fs.writeFileSync(path.join(FILES, fileName), buf);
      map[id] = `files/${fileName}`;
      console.log('img', fileName, buf.length);
    } catch (e) {
      console.log('img fail', id, e);
    }
  }
  fs.writeFileSync(path.join(OUT, `imgs-map-${prefix}.json`), JSON.stringify(map, null, 2));
  return map;
}

async function main() {
  fs.mkdirSync(FILES, { recursive: true });
  const client = new BeatscodeApiClient(
    process.env.BEATSCODE_API_URL!.trim(),
    process.env.BEATSCODE_USERNAME!.trim(),
    process.env.BEATSCODE_PASSWORD!.trim(),
  );
  await client.login();

  const endpoints: Array<[string, string, string]> = [
    ['material-types', '/clothing-material-type', '/travel/clothing-material-type'],
    ['material-types-2', '/clothing-material-type', '/clothing'],
    ['clothing-sets', '/clothing-set', '/travel/clothing-uniform'],
    ['clothing-sets-2', '/clothing-set', '/clothing'],
    ['clothing-uniform', '/clothing-uniform', '/travel/clothing-uniform'],
    ['clothing-uniform-2', '/clothing-uniform', '/uniform'],
    ['clothing-category', '/clothing-category', '/travel/clothing-category'],
    ['uniform-via-travel', '/uniform', '/travel/clothing-uniform'],
    ['kit-via-travel', '/kit', '/travel/clothing-uniform'],
  ];

  for (const [key, apiPath, route] of endpoints) {
    try {
      const rows = await client.listByPath(apiPath, route);
      console.log('OK', key, rows.length, rows[0] ? Object.keys(rows[0]).slice(0, 15).join(',') : '');
      if (!rows.length) continue;
      fs.writeFileSync(path.join(OUT, `api-${key}.json`), JSON.stringify(rows, null, 2));
      await downloadImages(client, rows, key);
    } catch (e) {
      console.log('NO', key, String(e instanceof Error ? e.message : e).slice(0, 100));
    }
  }

  // already have clothing-set from previous probe — re-download with images
  try {
    const rows = await client.listByPath('/clothing-set', '/travel/clothes-uniforms');
    console.log('OK clothing-set clothes-uniforms', rows.length);
    if (rows.length) {
      fs.writeFileSync(path.join(OUT, 'api-clothing-sets-final.json'), JSON.stringify(rows, null, 2));
      await downloadImages(client, rows, 'kit');
    }
  } catch (e) {
    console.log('NO clothing-set final', e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

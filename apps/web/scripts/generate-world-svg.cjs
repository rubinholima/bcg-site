/**
 * Gera world-fifa.svg a partir de Natural Earth (GeoJSON).
 * Uso:
 *   node scripts/generate-world-svg.cjs           → 110m (rápido, menor)
 *   node scripts/generate-world-svg.cjs 50         → 50m mais detalhado
 *   node scripts/generate-world-svg.cjs 50 countries → 50m + fronteiras de países
 * Escreve em public/maps/world-fifa.svg
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 500;
const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

const detail = process.argv[2] === '50' ? '50m' : '110m';
const withCountries = process.argv[3] === 'countries';
const LAND_URL = `${BASE}/ne_${detail}_land.geojson`;
const COUNTRIES_URL = `${BASE}/ne_${detail}_admin_0_countries.geojson`;

function lngLatToXY(lng, lat) {
  const x = ((lng + 180) / 360) * VIEWBOX_WIDTH;
  const y = ((90 - lat) / 180) * VIEWBOX_HEIGHT;
  return [Math.max(0, Math.min(VIEWBOX_WIDTH, x)), Math.max(0, Math.min(VIEWBOX_HEIGHT, y))];
}

function ringToPath(ring, step = 2) {
  const points = [];
  for (let i = 0; i < ring.length; i += step) {
    const [lng, lat] = ring[i];
    points.push(lngLatToXY(lng, lat));
  }
  if (points.length < 2) return '';
  const [x0, y0] = points[0];
  let d = `M ${Math.round(x0)} ${Math.round(y0)}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    d += ` L ${Math.round(x)} ${Math.round(y)}`;
  }
  return d + ' Z';
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function collectPaths(geojson, landStep) {
  const features = geojson.features || [];
  const paths = [];
  for (const f of features) {
    const geom = f.geometry;
    if (!geom) continue;
    if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
      const ring = geom.coordinates[0];
      const step = ring.length > 500 ? landStep : ring.length > 200 ? Math.max(1, landStep - 1) : 1;
      const d = ringToPath(ring, step);
      if (d) paths.push(d);
    }
    if (geom.type === 'MultiPolygon' && geom.coordinates) {
      for (const poly of geom.coordinates) {
        if (poly[0]) {
          const d = ringToPath(poly[0], landStep);
          if (d) paths.push(d);
        }
      }
    }
  }
  return paths;
}

async function main() {
  const landStep = detail === '50m' ? 3 : 2;
  console.log('Fetching land', LAND_URL, '...');
  const landJson = await fetchJson(LAND_URL);
  const landPaths = collectPaths(landJson, landStep);
  const landElements = landPaths
    .map((d) => `  <path fill="#94a3b8" fill-opacity="0.92" stroke="#cbd5e1" stroke-width="1" stroke-opacity="0.85" d="${d}" />`)
    .join('\n');

  let countriesGroup = '';
  if (withCountries) {
    console.log('Fetching countries', COUNTRIES_URL, '...');
    const countriesJson = await fetchJson(COUNTRIES_URL);
    const countryPaths = collectPaths(countriesJson, detail === '50m' ? 4 : 2);
    countriesGroup = `
  <!-- Fronteiras de países -->
  <g fill="none" stroke="#64748b" stroke-width="0.6" stroke-opacity="0.6">
${countryPaths.map((d) => `    <path d="${d}" />`).join('\n')}
  </g>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" aria-hidden="true">
  <!-- Mapa mundo Natural Earth ${detail} (equirectangular). Dados: naturalearthdata.com -->
  <g>
${landElements}
  </g>${countriesGroup}
</svg>
`;

  const outPath = path.join(__dirname, '..', 'public', 'maps', 'world-fifa.svg');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, 'utf8');
  console.log('Written:', outPath, '| land paths:', landPaths.length, withCountries ? '| country borders: yes' : '');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

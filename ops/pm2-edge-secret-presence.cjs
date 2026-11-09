/**
 * Verifica presença de CUP360_EDGE_HOST_SECRET no PM2 (não imprime valores).
 */
const { execSync } = require('child_process');
const j = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8' }));
const web = j.find((p) => p.name === 'bcg-web');
const api = j.find((p) => p.name === 'bcg-api');
function edgeSecret(proc) {
  const e = proc?.pm2_env?.env;
  if (e?.CUP360_EDGE_HOST_SECRET) return e.CUP360_EDGE_HOST_SECRET;
  return proc?.pm2_env?.CUP360_EDGE_HOST_SECRET;
}
const w = edgeSecret(web);
const a = edgeSecret(api);

console.log(
  JSON.stringify({
    webPresent: Boolean(w),
    apiPresent: Boolean(a),
    valuesMatch: Boolean(w && a && w === a),
  }),
);

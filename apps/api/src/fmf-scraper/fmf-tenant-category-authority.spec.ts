import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Invariante: código FMF em src/ nunca persiste Tenant.categories.
 */
describe('FMF tenant category authority', () => {
  const srcRoot = join(__dirname);

  function collectTsFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) out.push(...collectTsFiles(full));
      else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(full);
    }
    return out;
  }

  it('nenhum arquivo fmf-scraper/src escreve tenant.update com categories', () => {
    const forbidden = [
      /prisma\.tenant\.update\s*\(\s*\{[^}]*categories\s*:/s,
      /tenant\.update\s*\(\s*\{[^}]*categories\s*:/s,
    ];
    const files = collectTsFiles(srcRoot);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const re of forbidden) {
        if (re.test(text)) hits.push(file);
      }
    }
    expect(hits).toEqual([]);
  });
});

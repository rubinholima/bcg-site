/**
 * Remove blocos de header antigos (h1 text-3xl) das páginas do dashboard.
 * O header violeta passa a vir do DashboardPageFrame no layout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.join(__dirname, "../src/app/dashboard");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name === "page.tsx") acc.push(full);
  }
  return acc;
}

function stripOldHeader(content) {
  if (!content.includes('className="text-3xl font-bold')) return null;
  // Ignora stats dentro de Card (text-3xl em KPI)
  if (!/<h1[^>]*className="[^"]*text-3xl font-bold/.test(content)) return null;
  if (content.includes("data-dashboard-dept-header")) return null;

  let next = content;

  // Padrão 1: flex justify-between com h1 + opcional botão à direita
  next = next.replace(
    /\n\s*<div className="flex items-center justify-between">\s*\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground[^"]*">\s*[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n(?:\s*\{[\s\S]*?\}\s*\n|\s*<Link[\s\S]*?<\/Link>\s*\n)?\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 1b: só h1 + descrição (sem botão)
  next = next.replace(
    /\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground[^"]*">\s*[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 5: título + botões à direita (sem voltar)
  next = next.replace(
    /\n\s*<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">\s*\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground[^"]*">\s*[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n(\s*<Link[\s\S]*?<\/Link>\s*)\n\s*<\/div>\s*\n/g,
    "\n<div className=\"flex flex-wrap items-center justify-end gap-2\">$1</div>\n",
  );

  // Padrão 2: flex com gap + ArrowLeft + h1
  next = next.replace(
    /\n\s*<div className="flex(?: flex-col sm:flex-row sm:items-center sm:justify-between gap-4| items-center gap-3| items-center gap-4)[^"]*">\s*\n(?:\s*<Link[\s\S]*?<\/Link>\s*\n|\s*<Button[\s\S]*?<\/Button>\s*\n)*\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground[^"]*">[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n(?:\s*<Button[\s\S]*?<\/Button>\s*\n)?\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 3: flex-col sm:flex-row com back link wrapper
  next = next.replace(
    /\n\s*<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">\s*\n[\s\S]*?<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>[\s\S]*?<\/div>\s*\n\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 4: só título sem descrição
  next = next.replace(
    /\n\s*<div className="flex items-center justify-between">\s*\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<\/div>\s*\n[\s\S]*?<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 8: voltar + h1 (sem descrição)
  next = next.replace(
    /\n\s*<div className="flex items-center gap-4">\s*\n\s*<Link[\s\S]*?<\/Link>\s*\n\s*<div className="flex-1">\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 9: voltar + h1 + help icon row
  next = next.replace(
    /\n\s*<div className="flex items-center gap-4">\s*\n\s*<Link[\s\S]*?<\/Link>\s*\n\s*<div className="flex min-w-0 flex-1 items-center justify-between gap-3">\s*\n\s*<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">[\s\S]*?<\/h1>\s*\n\s*<Button[\s\S]*?<\/Button>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 10: flex-wrap title only (boston-tv)
  next = next.replace(
    /\n\s*<div className="flex flex-wrap items-start justify-between gap-4">\s*\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground[^"]*">\s*[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n/g,
    "\n",
  );

  // Padrão 11: arquivo/emprestados — voltar + título + botão outline
  next = next.replace(
    /\n\s*<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">\s*\n\s*<div className="flex items-center gap-3">\s*\n\s*<Link[\s\S]*?<\/Link>\s*\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground">\s*[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n\s*<\/div>\s*\n\s*<Link[\s\S]*?<\/Link>\s*\n\s*<\/div>\s*\n/g,
    "\n",
  );

  if (next === content) return null;

  // Padrão 6: sticky header com voltar + título + botão salvar
  next = next.replace(
    /\n\s*<div className="sticky top-0[^"]*">\s*\n\s*<div className="flex flex-wrap items-center justify-between gap-4">\s*\n\s*<Link[\s\S]*?<\/Link>\s*\n\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight[^"]*">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground">\s*[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n(\s*<Button[\s\S]*?<\/Button>\s*)\n\s*<\/div>\s*\n\s*<\/div>\s*\n/g,
    "\n<div className=\"flex flex-wrap items-center justify-end gap-2\">$1</div>\n",
  );

  // Padrão 7: h1 com ícone inline (flex items-center gap-2)
  next = next.replace(
    /\n\s*<div className="flex(?: flex-col gap-4 sm:flex-row sm:items-center sm:justify-between| items-center justify-between)[^"]*">\s*\n(?:\s*<Link[\s\S]*?<\/Link>\s*\n|\s*<Button[\s\S]*?<\/Button>\s*\n)*\s*<div>\s*\n\s*<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">[\s\S]*?<\/h1>\s*\n\s*<p className="text-muted-foreground[^"]*">[\s\S]*?<\/p>\s*\n\s*<\/div>\s*\n(?:\s*<div className="flex[\s\S]*?<\/div>\s*\n)?\s*<\/div>\s*\n/g,
    "\n",
  );

  if (next === content) return null;
  return next;
}

const pages = walk(dashboardDir);
let changed = 0;
let skipped = 0;

for (const file of pages) {
  const content = fs.readFileSync(file, "utf8");
  const updated = stripOldHeader(content);
  if (updated) {
    fs.writeFileSync(file, updated);
    changed++;
    console.log("OK", path.relative(dashboardDir, file));
  } else if (content.includes('className="text-3xl font-bold') && /<h1/.test(content)) {
    skipped++;
    console.log("SKIP", path.relative(dashboardDir, file));
  }
}

console.log(`\nAlterados: ${changed}, não alterados (manual): ${skipped}`);

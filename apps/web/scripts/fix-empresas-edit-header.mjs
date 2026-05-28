import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/app/dashboard/empresas/[id]/edit/page.tsx",
);
let c = fs.readFileSync(file, "utf8");
const next = c.replace(
  /<div className="space-y-6">\s*<div className="flex flex-wrap items-center justify-end gap-2">\s*<Button type="submit" form="form-empresa" disabled=\{loading\}>\s*\{loading \? "Salvando\.\.\." : "Salvar"\}\s*<\/Button>\s*<\/div>/,
  `<div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="submit" form="form-empresa" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>`,
);
if (next !== c) {
  fs.writeFileSync(file, next);
  console.log("fixed empresas edit");
} else {
  console.log("no match");
}

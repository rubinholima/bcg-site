import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorias</CardTitle>
          <CardDescription>
            Estas categorias são usadas como filtros e labels nos jogos. São valores fixos do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valor (interno)</TableHead>
                <TableHead>Label PT</TableHead>
                <TableHead>Label EN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FIXTURE_CATEGORIES.map((cat) => (
                <TableRow key={cat.value}>
                  <TableCell className="font-mono text-sm">{cat.value}</TableCell>
                  <TableCell>{cat.labelPT}</TableCell>
                  <TableCell>{cat.labelEN}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

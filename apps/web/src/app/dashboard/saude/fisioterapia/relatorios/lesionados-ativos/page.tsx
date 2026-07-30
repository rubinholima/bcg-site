import { FisioterapiaRelatorioLesionadosForm } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioForms";
import { FisioterapiaRelatorioShell } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioShell";

export default function FisioterapiaLesionadosReportPage() {
  return (
    <FisioterapiaRelatorioShell title="Lesionados em tratamento">
      <FisioterapiaRelatorioLesionadosForm />
    </FisioterapiaRelatorioShell>
  );
}

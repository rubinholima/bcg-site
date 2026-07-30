import { FisioterapiaRelatorioAtendimentosForm } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioForms";
import { FisioterapiaRelatorioShell } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioShell";

export default function FisioterapiaAtendimentosReportPage() {
  return (
    <FisioterapiaRelatorioShell title="Atendimentos">
      <FisioterapiaRelatorioAtendimentosForm />
    </FisioterapiaRelatorioShell>
  );
}

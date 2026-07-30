import { FisioterapiaRelatorioCargaForm } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioForms";
import { FisioterapiaRelatorioShell } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioShell";

export default function FisioterapiaCargaFisioReportPage() {
  return (
    <FisioterapiaRelatorioShell title="Carga por fisioterapeuta">
      <FisioterapiaRelatorioCargaForm />
    </FisioterapiaRelatorioShell>
  );
}

import { redirect } from "next/navigation";

/** Redireciona URL antiga (logística) para Cadastros Futebol */
export default function EspacosLogisticaRedirectPage() {
  redirect("/dashboard/cadastros/espacos");
}

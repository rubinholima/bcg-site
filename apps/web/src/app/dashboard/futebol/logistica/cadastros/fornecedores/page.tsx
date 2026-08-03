import { redirect } from "next/navigation";

/** Fornecedores unificados em Adm → Fornecedores. */
export default function LogisticaFornecedoresRedirectPage() {
  redirect("/dashboard/adm/fornecedores");
}

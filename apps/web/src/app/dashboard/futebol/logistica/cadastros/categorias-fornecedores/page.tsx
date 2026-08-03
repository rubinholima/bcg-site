import { redirect } from "next/navigation";

/** Categorias de fornecedor da logística foram unificadas no cadastro único de fornecedores. */
export default function LogisticaCategoriasFornecedoresRedirectPage() {
  redirect("/dashboard/adm/fornecedores");
}

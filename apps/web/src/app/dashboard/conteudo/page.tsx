import { redirect } from "next/navigation";

/** Legado: HomeContent JSON — redireciona para o editor canônico do group-home. */
export default function LegacyConteudoRedirect() {
  redirect("/dashboard/paginas/group-home/editar");
}

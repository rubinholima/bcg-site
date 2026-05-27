import { redirect } from "next/navigation";

/** Hub antigo — cadastros ficam dentro de cada departamento. */
export default function CadastrosHubRedirectPage() {
  redirect("/dashboard/futebol");
}

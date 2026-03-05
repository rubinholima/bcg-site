import { redirect } from "next/navigation";

// Calendário de consultas foi movido para Cadastros → Jogadores → [jogador] → Avaliação psicológica
export default function ConsultasRedirectPage() {
  redirect("/dashboard/cadastros/jogadores");
}

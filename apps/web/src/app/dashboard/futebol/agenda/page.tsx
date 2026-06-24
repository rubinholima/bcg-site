import { redirect } from "next/navigation";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";

export default function FutebolAgendaRedirectPage() {
  redirect(agendaHubUrl(AGENDA_VISAO.FUTEBOL));
}

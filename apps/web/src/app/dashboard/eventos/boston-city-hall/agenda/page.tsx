import { redirect } from "next/navigation";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";

export default function BostonCityHallAgendaRedirectPage() {
  redirect(agendaHubUrl(AGENDA_VISAO.BOSTON_HALL));
}

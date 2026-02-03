/**
 * Resposta de empresa para WorkMail (id, name, domain, workmailOrganizationId).
 */
export class WorkmailOrgDto {
  id: string;
  name: string;
  domain: string | null;
  workmailOrganizationId: string | null;
}

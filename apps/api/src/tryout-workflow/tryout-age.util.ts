/** Menor de 18 anos (data de nascimento YYYY-MM-DD ou ISO). */
export function isProspectMinorFromBirthDate(birthDate?: string | null): boolean {
  if (!birthDate?.trim()) return true;
  const raw = birthDate.trim();
  const d = new Date(raw.length <= 10 ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(d.getTime())) return true;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age < 18;
}

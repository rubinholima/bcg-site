/** Nome amigável a partir do arquivo enviado (sem extensão) — espelha a API. */
export function displayNameFromUploadFilename(originalname: string | undefined): string | null {
  if (!originalname || typeof originalname !== "string") return null;
  const last = originalname.trim().split(/[/\\]/).pop() ?? "";
  const withoutExt = last.replace(/\.[^.]+$/, "").trim();
  return withoutExt.length > 0 ? withoutExt : null;
}

/** Principais categorias de senhas para o Vault (dropdown). */
export const VAULT_CATEGORIES = [
  "Email",
  "App",
  "Servidor",
  "Rede / VPN",
  "Banco de dados",
  "Cloud",
  "Redes sociais",
  "Documentos",
  "Outra",
] as const;

export type VaultCategory = (typeof VAULT_CATEGORIES)[number];

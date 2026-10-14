export const BCH_DEFAULT_OPERATIONAL_ROLES = [
  { code: 'bartender', name: 'Bartender', sortOrder: 10 },
  { code: 'security', name: 'Segurança', sortOrder: 20 },
  { code: 'cashier', name: 'Caixa', sortOrder: 30 },
  { code: 'production', name: 'Produção', sortOrder: 40 },
  { code: 'reception', name: 'Recepção', sortOrder: 50 },
  { code: 'cleaning', name: 'Limpeza', sortOrder: 60 },
  { code: 'sound_lighting', name: 'Som e iluminação', sortOrder: 70 },
] as const;

export type BchOperationalRoleDto = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

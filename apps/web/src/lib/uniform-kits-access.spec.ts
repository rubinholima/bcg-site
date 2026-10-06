import { canManageUniformKits, canReadUniformKitsInLogistics } from "./uniform-kits-access";

describe("uniform-kits-access", () => {
  const can = (slugs: string[]) => (s: string) => slugs.includes(s);

  it("company admin gerencia sem módulo logística", () => {
    expect(canManageUniformKits("company_admin", can([]))).toBe(true);
  });

  it("usuário com módulo dedicado gerencia", () => {
    expect(canManageUniformKits("user", can(["futebol_logistica_uniformes"]))).toBe(true);
  });

  it("usuário sem permissão não gerencia", () => {
    expect(canManageUniformKits("user", can(["tipos"]))).toBe(false);
  });

  it("logística lê kits com futebol_logistica", () => {
    expect(canReadUniformKitsInLogistics("user", can(["futebol_logistica"]))).toBe(true);
  });
});

import {
  negociadosEditarHref,
  negociadosListHref,
  negociadosNovaHref,
} from "./player-negotiation-navigation";

describe("player-negotiation-navigation", () => {
  it("lista sem filtro de clube", () => {
    expect(negociadosListHref()).toBe("/dashboard/cadastros/jogadores/negociados");
    expect(negociadosListHref("  ")).toBe("/dashboard/cadastros/jogadores/negociados");
  });

  it("lista preserva tenantId como query opcional", () => {
    expect(negociadosListHref("tenant-a")).toBe(
      "/dashboard/cadastros/jogadores/negociados?tenantId=tenant-a",
    );
  });

  it("nova negociação não exige clube da listagem", () => {
    expect(negociadosNovaHref()).toBe("/dashboard/cadastros/jogadores/negociados/nova");
    expect(negociadosNovaHref({ tenantId: "t1" })).toContain("tenantId=t1");
    expect(negociadosNovaHref({ tenantId: "t1", playerId: "p1" })).toContain("playerId=p1");
  });

  it("editar usa id na rota", () => {
    expect(negociadosEditarHref("abc-123")).toBe(
      "/dashboard/cadastros/jogadores/negociados/abc-123/editar",
    );
  });
});

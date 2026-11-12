import { splitInstallmentPreview } from "./finance-installment-util";

describe("splitInstallmentPreview", () => {
  it("fecha o total em 5 parcelas", () => {
    const parts = splitInstallmentPreview(500, 5);
    const sum = parts.reduce((s, p) => s + p.amount, 0);
    expect(sum).toBe(500);
    expect(parts).toHaveLength(5);
  });
});

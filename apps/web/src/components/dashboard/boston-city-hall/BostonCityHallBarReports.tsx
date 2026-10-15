"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BchCard } from "@/components/dashboard/boston-city-hall/BchCard";
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchMetricsStrip } from "@/components/dashboard/boston-city-hall/BchMetricsStrip";
import { BchModuleSubNav } from "@/components/dashboard/boston-city-hall/BchModuleSubNav";
import { BCH_BAR_SUBNAV } from "@/components/dashboard/boston-city-hall/bch-subnav.config";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { bchProductDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SalesReport = {
  salesCount: number;
  netSales: string;
  estimatedGrossMargin: string;
  marginIncomplete: boolean;
};

type ProductRow = {
  productName: string;
  sellingUnitName: string;
  quantitySold: string;
  revenue: string;
  grossMargin: string;
};

type PaymentRow = { methodLabel: string; count: number; totalAmount: string };

export function BostonCityHallBarReports() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loss, setLoss] = useState<Array<{ movementType: string; quantity: string }>>([]);
  const [view, setView] = useState("sales");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: s }, { data: p }, { data: pay }, { data: l }] = await Promise.all([
        api.get<SalesReport>("/boston-city-hall/bar/reports/sales"),
        api.get<ProductRow[]>("/boston-city-hall/bar/reports/products"),
        api.get<PaymentRow[]>("/boston-city-hall/bar/reports/payments"),
        api.get<Array<{ movementType: string; quantity: string }>>("/boston-city-hall/bar/reports/loss"),
      ]);
      setSales(s);
      setProducts(Array.isArray(p) ? p : []);
      setPayments(Array.isArray(pay) ? pay : []);
      setLoss(Array.isArray(l) ? l : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <BchDestinationPageShell
        title="Relatórios"
        breadcrumbs={[
          { href: BCH_BASE, label: "Boston City Hall" },
          { label: "Bar e estoque" },
          { label: "Relatórios" },
        ]}
        subNav={<BchModuleSubNav items={BCH_BAR_SUBNAV} ariaLabel="Bar" />}
      >
        <BchLoadingBlock label="Carregando relatórios…" />
      </BchDestinationPageShell>
    );
  }

  return (
    <BchDestinationPageShell
      title="Relatórios"
      breadcrumbs={[
        { href: BCH_BASE, label: "Boston City Hall" },
        { label: "Bar e estoque" },
        { label: "Relatórios" },
      ]}
      subNav={<BchModuleSubNav items={BCH_BAR_SUBNAV} ariaLabel="Bar" />}
    >
      <BchFilterBar>
        <div className="min-w-[200px]">
          <label className="mb-1 block text-xs text-muted-foreground">Visão</label>
          <NativeSelect className="min-h-[44px] w-full" value={view} onChange={(e) => setView(e.target.value)}>
            <option value="sales">Vendas</option>
            <option value="products">Produtos</option>
            <option value="payments">Pagamentos</option>
            <option value="loss">Perdas / divergência</option>
          </NativeSelect>
        </div>
      </BchFilterBar>

      {view === "sales" && sales ? (
        <BchMetricsStrip
          title="Vendas (período)"
          items={[
            { label: "Concluídas", value: sales.salesCount },
            { label: "Receita líquida", value: `R$ ${sales.netSales}` },
            {
              label: "Margem bruta est.",
              value: `R$ ${sales.estimatedGrossMargin}`,
              title: sales.marginIncomplete ? "Custos ausentes em vendas antigas" : undefined,
            },
          ]}
        />
      ) : null}

      {view === "products" ? (
        products.length === 0 ? (
          <BchEmptyState message="Nenhuma venda por produto no período." />
        ) : (
          <BchCard title="Por produto">
            <div className={BCH_TABLE_WRAP}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((r, i) => (
                    <TableRow key={`${r.productName}-${i}`}>
                      <TableCell>{bchProductDisplayName(r.productName)}</TableCell>
                      <TableCell>{r.sellingUnitName}</TableCell>
                      <TableCell>{r.quantitySold}</TableCell>
                      <TableCell>{r.revenue}</TableCell>
                      <TableCell>{r.grossMargin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </BchCard>
        )
      ) : null}

      {view === "payments" ? (
        payments.length === 0 ? (
          <BchEmptyState message="Nenhum pagamento registrado no período." />
        ) : (
          <BchCard title="Por forma de pagamento">
            <div className={BCH_TABLE_WRAP}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((r) => (
                    <TableRow key={r.methodLabel}>
                      <TableCell>{r.methodLabel}</TableCell>
                      <TableCell>{r.count}</TableCell>
                      <TableCell>{r.totalAmount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </BchCard>
        )
      ) : null}

      {view === "loss" ? (
        loss.length === 0 ? (
          <BchEmptyState message="Nenhuma perda ou divergência no período." />
        ) : (
          <BchCard title="Perdas e divergências">
            <div className={BCH_TABLE_WRAP}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loss.map((r) => (
                    <TableRow key={r.movementType}>
                      <TableCell>{r.movementType}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </BchCard>
        )
      ) : null}
    </BchDestinationPageShell>
  );
}

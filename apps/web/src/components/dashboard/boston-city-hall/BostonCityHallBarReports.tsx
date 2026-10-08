"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventos/boston-city-hall/bar"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao bar
      </Link>
      <NativeSelect className="min-h-[44px] max-w-xs" value={view} onChange={(e) => setView(e.target.value)}>
        <option value="sales">Vendas</option>
        <option value="products">Produtos</option>
        <option value="payments">Pagamentos</option>
        <option value="loss">Perdas / divergência</option>
      </NativeSelect>

      {view === "sales" && sales ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vendas concluídas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Quantidade: {sales.salesCount}</p>
            <p>Receita líquida: R$ {sales.netSales}</p>
            <p>Margem bruta est.: R$ {sales.estimatedGrossMargin}</p>
            {sales.marginIncomplete ? <p className="text-amber-400">Margem incompleta (custos ausentes).</p> : null}
          </CardContent>
        </Card>
      ) : null}

      {view === "products" ? (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
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
                    <TableCell>{r.productName}</TableCell>
                    <TableCell>{r.sellingUnitName}</TableCell>
                    <TableCell>{r.quantitySold}</TableCell>
                    <TableCell>{r.revenue}</TableCell>
                    <TableCell>{r.grossMargin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {view === "payments" ? (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
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
          </CardContent>
        </Card>
      ) : null}

      {view === "loss" ? (
        <Card>
          <CardContent className="overflow-x-auto pt-4">
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

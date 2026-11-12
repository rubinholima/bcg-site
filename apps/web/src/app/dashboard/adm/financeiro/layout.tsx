import { FinanceiroTenantShell } from "./financeiro-tenant-shell";

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return <FinanceiroTenantShell>{children}</FinanceiroTenantShell>;
}

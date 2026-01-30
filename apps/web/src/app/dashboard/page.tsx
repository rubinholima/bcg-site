import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";

async function getTenants(): Promise<Tenant[]> {
  try {
    const { data } = await api.get<Tenant[]>("/tenants");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar empresas:", error);
    return [];
  }
}

export default async function DashboardPage() {
  const tenants = await getTenants();
  const totalEmpresas = tenants.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo à plataforma Boston City Group
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Empresas
              </p>
              <p className="text-2xl font-bold">{totalEmpresas}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Páginas Publicadas
              </p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Notícias Publicadas
              </p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Usuários Ativos
              </p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

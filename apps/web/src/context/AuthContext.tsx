"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { authFetch } from "@/lib/authFetch";
import type { MeResponse } from "@/types/auth";

interface AuthState {
  user: MeResponse["user"] | null;
  groups: string[];
  role: MeResponse["role"] | null;
  modules: string[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  isSuperAdmin: boolean;
  isCompanyAdmin: boolean;
  isEditor: boolean;
  canAccessDashboard: boolean;
  canAccessModule: (slug: string) => boolean;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({
    user: null,
    groups: [],
    role: null,
    modules: [],
    loading: true,
  });

  const fetchMe = useCallback(async () => {
    try {
      const res = await authFetch("/api/me");
      if (!res.ok) {
        setState({ user: null, groups: [], role: null, modules: [], loading: false });
        return;
      }
      const data: MeResponse = await res.json();
      const canAccessDashboard =
        data.role === "super_admin" ||
        data.role === "company_admin" ||
        data.role === "editor";
      let modules: string[] = [];
      if (canAccessDashboard) {
        try {
          const modRes = await authFetch("/api/me/modules");
          if (modRes.ok) {
            const modData = await modRes.json();
            modules = modData.modules ?? [];
          }
          // Se a API retornou lista vazia (erro ou módulos não configurados), usa lista padrão
          // para o menu não sumir (ex.: Empresas). O backend continua protegendo cada rota.
          if (modules.length === 0) {
            modules = [
              "dashboard",
              "grupo_master",
              "usuarios",
              "empresas",
              "emails",
              "tipos",
              "paginas",
              "noticias",
              "midia",
              "vault",
              "configuracoes",
            ];
          }
        } catch {
          // API fora: mostra todos os itens do menu para quem tem acesso ao dashboard
          modules = [
            "dashboard",
            "grupo_master",
            "usuarios",
            "empresas",
            "emails",
            "tipos",
            "paginas",
            "noticias",
            "midia",
            "vault",
            "configuracoes",
          ];
        }
      }
      setState({
        user: data.user,
        groups: data.groups ?? [],
        role: data.role,
        modules,
        loading: false,
      });
    } catch {
      setState({ user: null, groups: [], role: null, modules: [], loading: false });
    }
  }, []);

  useEffect(() => {
    // Na página de login não chama /api/me (evita 401 no console)
    if (pathname === "/login") {
      setState({ user: null, groups: [], role: null, modules: [], loading: false });
      return;
    }
    fetchMe();
  }, [pathname, fetchMe]);

  const isSuperAdmin = state.role === "super_admin";
  const isCompanyAdmin = state.role === "company_admin";
  const isEditor = state.role === "editor";
  const canAccessDashboard = isSuperAdmin || isCompanyAdmin || isEditor;
  const canAccessModule = (slug: string) => state.modules.includes(slug);

  const value: AuthContextValue = {
    ...state,
    isSuperAdmin,
    isCompanyAdmin,
    isEditor,
    canAccessDashboard,
    canAccessModule,
    refetch: fetchMe,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

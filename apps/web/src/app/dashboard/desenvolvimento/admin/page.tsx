"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { DesenvolvimentoAdminPanel } from "@/components/dashboard/desenvolvimento/DesenvolvimentoAdminPanel";

export default function DesenvolvimentoAdminPage() {
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessModule("desenvolvimento__desenvolvimento_admin")) {
      router.replace("/dashboard/desenvolvimento");
    }
  }, [canAccessModule, loading, router]);

  return <DesenvolvimentoAdminPanel />;
}

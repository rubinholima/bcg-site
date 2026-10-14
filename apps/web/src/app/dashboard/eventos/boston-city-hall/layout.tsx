"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BchAppShell } from "@/components/dashboard/boston-city-hall/BchAppShell";
import { useAuth } from "@/context/AuthContext";

export default function BostonCityHallLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("eventos")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("eventos")) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#070b12]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400/80" />
      </div>
    );
  }

  return <BchAppShell>{children}</BchAppShell>;
}

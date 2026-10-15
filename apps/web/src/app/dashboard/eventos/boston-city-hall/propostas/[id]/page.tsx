"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BostonCityHallProposalEditor } from "@/components/dashboard/boston-city-hall/BostonCityHallProposalEditor";
import { useAuth } from "@/context/AuthContext";

function EditorInner() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return <BostonCityHallProposalEditor proposalId={id} />;
}

export default function BostonCityHallProposalDetailPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("eventos")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("eventos")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditorInner />
    </Suspense>
  );
}

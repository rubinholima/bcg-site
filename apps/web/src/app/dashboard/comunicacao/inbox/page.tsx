"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CommunicationInbox } from "@/components/dashboard/comunicacao/CommunicationInbox";

export default function ComunicacaoInboxPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("comunicacao")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  if (authLoading || !canAccessModule("comunicacao")) {
    return null;
  }

  return <CommunicationInbox />;
}

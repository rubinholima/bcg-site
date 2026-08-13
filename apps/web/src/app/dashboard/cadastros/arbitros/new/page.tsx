"use client";

import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { MatchRefereeForm } from "@/components/dashboard/cadastros/MatchRefereeForm";

export default function NovoArbitroPage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/cadastros/arbitros"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Árbitros
      </Link>
      <MatchRefereeForm
        mode="create"
        cancelHref="/dashboard/cadastros/arbitros"
        onSaved={(id) => {
          markSaveSuccessForNavigation();
          router.replace(`/dashboard/cadastros/arbitros/${id}/edit`);
        }}
      />
    </div>
  );
}

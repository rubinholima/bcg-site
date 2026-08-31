"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { MatchRefereeForm } from "@/components/dashboard/cadastros/MatchRefereeForm";
import { CADASTRO_LIST_HREFS, finishCadastroSave } from "@/lib/cadastros-navigation";

export default function NovoArbitroPage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <Link
        href={CADASTRO_LIST_HREFS.arbitros}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Árbitros
      </Link>
      <MatchRefereeForm
        mode="create"
        cancelHref={CADASTRO_LIST_HREFS.arbitros}
        onSaved={() => finishCadastroSave(router, CADASTRO_LIST_HREFS.arbitros)}
      />
    </div>
  );
}

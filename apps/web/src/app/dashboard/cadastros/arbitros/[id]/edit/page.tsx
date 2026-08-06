"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MatchRefereeForm } from "@/components/dashboard/cadastros/MatchRefereeForm";

export default function EditArbitroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
        mode="edit"
        refereeId={id}
        cancelHref="/dashboard/cadastros/arbitros"
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

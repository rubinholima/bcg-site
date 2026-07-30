"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FisioterapeutaForm } from "@/components/dashboard/fisioterapia/FisioterapeutaForm";

export default function NovoFisioterapeutaPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/saude/fisioterapeutas" className="text-sm text-muted-foreground hover:text-foreground">
        ← Fisioterapeutas
      </Link>
      <FisioterapeutaForm
        mode="create"
        cancelHref="/dashboard/saude/fisioterapeutas"
        onSaved={(id) => router.push(`/dashboard/saude/fisioterapeutas/${id}/edit?success=new`)}
      />
    </div>
  );
}

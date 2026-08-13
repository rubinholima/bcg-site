"use client";

import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation } from "@/hooks/use-save-success-feedback";
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
        onSaved={(id) => {
          markSaveSuccessForNavigation();
          router.replace(`/dashboard/saude/fisioterapeutas/${id}/edit`);
        }}
      />
    </div>
  );
}

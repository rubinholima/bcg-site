"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { FisioterapeutaForm } from "@/components/dashboard/fisioterapia/FisioterapeutaForm";
import { useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";

export default function EditarFisioterapeutaPage() {
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/saude/fisioterapeutas" className="text-sm text-muted-foreground hover:text-foreground">
        ← Fisioterapeutas
      </Link>
      <FisioterapeutaForm
        mode="edit"
        staffId={id}
        cancelHref="/dashboard/saude/fisioterapeutas"
        onSaved={() => notifySaved()}
      />
      <SaveSuccessModal />
    </div>
  );
}

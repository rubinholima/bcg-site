"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayrollFolhaTabs } from "./PayrollFolhaTabs";

export default function PayrollClosingDetailPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-6xl">
      <Button type="button" variant="ghost" size="sm" asChild className="min-h-[44px]">
        <Link href="/dashboard/adm/rh">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao RH
        </Link>
      </Button>
      <PayrollFolhaTabs closingId={id} />
    </div>
  );
}

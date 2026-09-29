"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { CaptacaoMobileWizard } from "@/components/dashboard/futebol/CaptacaoMobileWizard";

export default function CaptacaoNovoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CaptacaoMobileWizard />
    </Suspense>
  );
}

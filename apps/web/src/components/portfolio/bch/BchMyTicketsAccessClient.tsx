"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { exchangeBchMyTicketsMagicLink } from "@/lib/bch-my-tickets";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type Props = {
  token: string;
  lang: "pt" | "en";
  redirectPath: string;
};

export function BchMyTicketsAccessClient({ token, lang, redirectPath }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token.trim()) {
      setError(lang === "pt" ? "Link inválido." : "Invalid link.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const out = await exchangeBchMyTicketsMagicLink(token);
        if (cancelled) return;
        router.replace(out.redirectPath || redirectPath);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : lang === "pt" ? "Link expirado." : "Link expired.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, lang, redirectPath, router]);

  return (
    <>
      {!error ? (
        <p className="mt-10 text-center text-sm text-zinc-400">
          {lang === "pt" ? "Validando acesso…" : "Validating access…"}
        </p>
      ) : null}
      <FeedbackModal
        open={Boolean(error)}
        onOpenChange={() => setError(null)}
        title={lang === "pt" ? "Não foi possível acessar" : "Access failed"}
        message={error ?? ""}
      />
    </>
  );
}

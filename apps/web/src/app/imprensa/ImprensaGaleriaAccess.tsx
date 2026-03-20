"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { extractGalleryToken } from "./extract-gallery-token";

export function ImprensaGaleriaAccess() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const token = extractGalleryToken(value);
    if (!token) {
      setError("Cole o link completo que recebeu ou só o código (letras e números após /galeria/).");
      return;
    }
    setPending(true);
    router.push(`/eventos/gallery/${token}`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="imprensa-link" className="text-zinc-200">
          Link ou código do álbum
        </Label>
        <Input
          id="imprensa-link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://…/eventos/gallery/… ou só o código"
          className="min-h-12 text-base text-foreground"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={pending}
        />
      </div>
      <Button type="submit" className="min-h-12 w-full gap-2 text-base" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Abrindo…
          </>
        ) : (
          <>
            Abrir galeria
            <ArrowRight className="h-5 w-5" />
          </>
        )}
      </Button>
      <p className="text-center text-sm text-zinc-500">
        Não tem link?{" "}
        <span className="text-zinc-400">Fale com a assessoria do evento ou do clube Boston City.</span>
      </p>
      <p className="text-center">
        <Link href="/" className="text-sm text-amber-400 hover:underline">
          ← Voltar ao site
        </Link>
      </p>
    </form>
  );
}

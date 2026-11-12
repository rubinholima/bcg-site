"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  faceFile: File | null;
  fullBodyFile: File | null;
  onFaceChange: (file: File | null) => void;
  onFullBodyChange: (file: File | null) => void;
  className?: string;
};

function PhotoSlot({
  label,
  hint,
  file,
  onChange,
  capture,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
  capture?: "user" | "environment";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={cn(
          "relative flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3",
          preview && "border-solid",
        )}
      >
        {preview ? (
          <div className="relative h-36 w-full max-w-[200px] overflow-hidden rounded-md bg-black/40">
            <Image
              src={preview}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <User className="h-10 w-10 text-muted-foreground" aria-hidden />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/*"
          capture={capture}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full sm:w-auto"
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          {file ? "Trocar foto" : "Escolher ou tirar foto"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

export function CaptacaoProspectPhotoFields({
  faceFile,
  fullBodyFile,
  onFaceChange,
  onFullBodyChange,
  className,
}: Props) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
      <PhotoSlot
        label="Foto de rosto *"
        hint="Rosto de frente, fundo neutro se possível."
        file={faceFile}
        onChange={onFaceChange}
        capture="user"
      />
      <PhotoSlot
        label="Foto corpo inteiro *"
        hint="De pé, roupa de treino ou uniforme."
        file={fullBodyFile}
        onChange={onFullBodyChange}
        capture="environment"
      />
    </div>
  );
}

"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PageSeoSettings } from "@/types/page";
import { MediaPicker } from "@/components/dashboard/MediaPicker";

export function PageSeoPanel({
  seo,
  onChange,
}: {
  seo: PageSeoSettings;
  onChange: (key: keyof PageSeoSettings, value: string | boolean | undefined) => void;
}) {
  const descLen = (seo.metaDescription ?? "").length;
  const titleLen = (seo.seoTitle ?? "").length;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">SEO da página</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Título SEO ({titleLen}/60)</Label>
          <Input value={seo.seoTitle ?? ""} onChange={(e) => onChange("seoTitle", e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Meta descrição ({descLen}/160)</Label>
          <Input value={seo.metaDescription ?? ""} onChange={(e) => onChange("metaDescription", e.target.value)} maxLength={200} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Imagem social (Open Graph)</Label>
          <MediaPicker sizeKey="card" value={seo.ogImage ?? ""} onChange={(url) => onChange("ogImage", url)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Open Graph — título</Label>
          <Input value={seo.ogTitle ?? ""} onChange={(e) => onChange("ogTitle", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Open Graph — descrição</Label>
          <Input value={seo.ogDescription ?? ""} onChange={(e) => onChange("ogDescription", e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">Canonical (opcional — só se necessário)</Label>
          <Input value={seo.canonicalOverride ?? ""} onChange={(e) => onChange("canonicalOverride", e.target.value)} placeholder="Deixe vazio para automático" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={seo.robotsIndex !== false}
            onChange={(e) => onChange("robotsIndex", e.target.checked)}
          />
          Permitir indexação (index)
        </label>
      </CardContent>
    </Card>
  );
}

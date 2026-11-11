"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HomeContentBlock } from "@/types/home-content";
import type { BlockConfigValue } from "@/types/block-config";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { BlockAlignmentFields } from "./BlockAlignmentFields";
import { fetchFixtures, type FixtureItem } from "@/lib/fixtures-shared";
import { RichTextEditor } from "./RichTextEditor";
import { Plus, Trash2 } from "lucide-react";

type Updater = (key: string, value: BlockConfigValue) => void;

export function FootballBlockModuleEditor({
  block,
  tenantSlug,
  update,
}: {
  block: HomeContentBlock;
  tenantSlug?: string;
  update: Updater;
}) {
  const t = block.type;
  if (t === "match_day_hero") return <MatchDayHeroEditor block={block} tenantSlug={tenantSlug} update={update} />;
  if (t === "countdown_block") return <CountdownEditor block={block} update={update} />;
  if (t === "match_center") return <MatchCenterEditor block={block} tenantSlug={tenantSlug} update={update} />;
  if (t === "technical_staff_public") return <TechnicalStaffEditor block={block} update={update} />;
  if (t === "stadium_public") return <StadiumEditor block={block} update={update} />;
  if (t === "honors_block") return <HonorsEditor block={block} update={update} />;
  if (t === "membership_public") return <MembershipEditor block={block} update={update} />;
  if (t === "statistics_public") return <StatisticsEditor block={block} update={update} />;
  if (t === "video_block") return <VideoEditor block={block} update={update} />;
  if (t === "social_links_block") return <SocialEditor block={block} update={update} />;
  return null;
}

function Titles({ block, update }: { block: HomeContentBlock; update: Updater }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">Título PT</Label>
        <Input value={(block.config?.titlePt as string) ?? ""} onChange={(e) => update("titlePt", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Título EN</Label>
        <Input value={(block.config?.titleEn as string) ?? ""} onChange={(e) => update("titleEn", e.target.value)} />
      </div>
    </div>
  );
}

function MatchDayHeroEditor({
  block,
  tenantSlug,
  update,
}: {
  block: HomeContentBlock;
  tenantSlug?: string;
  update: Updater;
}) {
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  useEffect(() => {
    if (!tenantSlug) return;
    fetchFixtures(tenantSlug, "tenant").then(setFixtures).catch(() => {});
  }, [tenantSlug]);
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      <div className="space-y-1">
        <Label className="text-xs">Jogo</Label>
        <Select
          value={(block.config?.matchDayMode as string) ?? "next"}
          onValueChange={(v) => update("matchDayMode", v)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Próximo jogo automaticamente</SelectItem>
            <SelectItem value="specific">Fixture específica</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(block.config?.matchDayMode as string) === "specific" ? (
        <Select
          value={(block.config?.matchDayFixtureId as string) ?? ""}
          onValueChange={(v) => update("matchDayFixtureId", v)}
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {fixtures.map((f) => (
              <SelectItem key={f.externalId} value={f.externalId}>
                {f.homeTeamName} x {f.awayTeamName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <MediaPicker
        label="Imagem de fundo"
        sizeKey="backgrounds"
        value={(block.config?.backgroundImage as string) ?? ""}
        onChange={(url) => update("backgroundImage", url)}
      />
      <Input
        placeholder="URL ingressos (CTA)"
        value={(block.config?.ctaUrl as string) ?? ""}
        onChange={(e) => update("ctaUrl", e.target.value)}
      />
      <BlockAlignmentFields
        titleAlign={block.config?.titleAlign as string}
        bodyAlign={block.config?.bodyAlign as string}
        onTitleAlign={(v) => update("titleAlign", v)}
        onBodyAlign={(v) => update("bodyAlign", v)}
        showSubtitle={false}
      />
    </div>
  );
}

function CountdownEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="space-y-1">
        <Label className="text-xs">Origem</Label>
        <Select value={(block.config?.countdownSource as string) ?? "manual"} onValueChange={(v) => update("countdownSource", v)}>
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Data manual</SelectItem>
            <SelectItem value="fixture">Fixture (via ID no bloco Match Day)</SelectItem>
            <SelectItem value="event">Evento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Input
        type="datetime-local"
        className="text-foreground"
        value={((block.config?.countdownTargetISO as string) ?? "").slice(0, 16)}
        onChange={(e) => update("countdownTargetISO", e.target.value ? new Date(e.target.value).toISOString() : "")}
      />
      <Titles block={block} update={update} />
    </div>
  );
}

function MatchCenterEditor({
  block,
  tenantSlug,
  update,
}: {
  block: HomeContentBlock;
  tenantSlug?: string;
  update: Updater;
}) {
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  useEffect(() => {
    if (!tenantSlug) return;
    fetchFixtures(tenantSlug, "tenant").then(setFixtures).catch(() => {});
  }, [tenantSlug]);
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      <Select
        value={(block.config?.matchCenterFixtureId as string) ?? ""}
        onValueChange={(v) => update("matchCenterFixtureId", v)}
      >
        <SelectTrigger className="min-h-[44px]">
          <SelectValue placeholder="Jogo público…" />
        </SelectTrigger>
        <SelectContent>
          {fixtures.map((f) => (
            <SelectItem key={f.externalId} value={f.externalId}>
              {f.homeTeamName} x {f.awayTeamName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TechnicalStaffEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  const items = (block.config?.staffMembers as Array<{ name?: string; role?: string; photoUrl?: string }>) ?? [];
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      <Select value={(block.config?.staffLayout as string) ?? "grid"} onValueChange={(v) => update("staffLayout", v)}>
        <SelectTrigger className="min-h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="grid">Grade</SelectItem>
          <SelectItem value="cards">Cards</SelectItem>
          <SelectItem value="compact">Compacto</SelectItem>
        </SelectContent>
      </Select>
      {items.map((item, i) => (
        <div key={i} className="rounded border border-border p-2 space-y-2">
          <Input placeholder="Nome" value={item.name ?? ""} onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], name: e.target.value };
            update("staffMembers", next);
          }} />
          <Input placeholder="Função" value={item.role ?? ""} onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], role: e.target.value };
            update("staffMembers", next);
          }} />
          <MediaPicker label="Foto" sizeKey="card" value={item.photoUrl ?? ""} onChange={(url) => {
            const next = [...items];
            next[i] = { ...next[i], photoUrl: url };
            update("staffMembers", next);
          }} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => update("staffMembers", [...items, { name: "", role: "" }])}>
        <Plus className="mr-1 h-4 w-4" /> Membro
      </Button>
    </div>
  );
}

function StadiumEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      <Input placeholder="Nome" value={(block.config?.stadiumName as string) ?? ""} onChange={(e) => update("stadiumName", e.target.value)} />
      <Input placeholder="Local" value={(block.config?.stadiumLocation as string) ?? ""} onChange={(e) => update("stadiumLocation", e.target.value)} />
      <Input placeholder="Capacidade" value={String(block.config?.stadiumCapacity ?? "")} onChange={(e) => update("stadiumCapacity", e.target.value)} />
      <MediaPicker label="Foto" sizeKey="card" value={(block.config?.stadiumPhoto as string) ?? ""} onChange={(url) => update("stadiumPhoto", url)} />
      <RichTextEditor
        value={(block.config?.bodyPt as string) ?? ""}
        onChange={(html) => update("bodyPt", html)}
        placeholder="Descrição PT"
      />
    </div>
  );
}

function HonorsEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  const items = (block.config?.honorsItems as Array<{ title?: string; year?: string; image?: string; description?: string }>) ?? [];
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded border border-border p-2">
          <Input placeholder="Título" value={item.title ?? ""} onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], title: e.target.value };
            update("honorsItems", next);
          }} />
          <Input placeholder="Ano/temporada" value={item.year ?? ""} onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], year: e.target.value };
            update("honorsItems", next);
          }} />
          <MediaPicker label="Imagem" sizeKey="card" value={item.image ?? ""} onChange={(url) => {
            const next = [...items];
            next[i] = { ...next[i], image: url };
            update("honorsItems", next);
          }} />
          <Button type="button" variant="ghost" size="sm" onClick={() => update("honorsItems", items.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => update("honorsItems", [...items, { title: "", year: "" }])}>
        Adicionar troféu
      </Button>
    </div>
  );
}

function MembershipEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      <RichTextEditor value={(block.config?.bodyPt as string) ?? ""} onChange={(v) => update("bodyPt", v)} />
      <Input placeholder="URL do CTA" value={(block.config?.ctaUrl as string) ?? ""} onChange={(e) => update("ctaUrl", e.target.value)} />
    </div>
  );
}

function StatisticsEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  const items = (block.config?.statItems as Array<{ label?: string; value?: string }>) ?? [];
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      {items.map((item, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Rótulo" value={item.label ?? ""} onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], label: e.target.value };
            update("statItems", next);
          }} />
          <Input placeholder="Valor" value={item.value ?? ""} onChange={(e) => {
            const next = [...items];
            next[i] = { ...next[i], value: e.target.value };
            update("statItems", next);
          }} />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => update("statItems", [...items, { label: "", value: "" }])}>
        Adicionar estatística
      </Button>
    </div>
  );
}

function VideoEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      <Input placeholder="URL YouTube/Vimeo" value={(block.config?.videoUrl as string) ?? ""} onChange={(e) => update("videoUrl", e.target.value)} />
      <Select value={(block.config?.videoAspectRatio as string) ?? "16/9"} onValueChange={(v) => update("videoAspectRatio", v)}>
        <SelectTrigger className="min-h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="16/9">16:9</SelectItem>
          <SelectItem value="4/3">4:3</SelectItem>
        </SelectContent>
      </Select>
      <MediaPicker label="Poster" sizeKey="card" value={(block.config?.videoPoster as string) ?? ""} onChange={(url) => update("videoPoster", url)} />
    </div>
  );
}

function SocialEditor({ block, update }: { block: HomeContentBlock; update: Updater }) {
  const links = (block.config?.socialLinks as Array<{ label?: string; url?: string; network?: string }>) ?? [];
  return (
    <div className="space-y-3 sm:col-span-2">
      <Titles block={block} update={update} />
      {links.map((link, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Rede" value={link.network ?? ""} onChange={(e) => {
            const next = [...links];
            next[i] = { ...next[i], network: e.target.value };
            update("socialLinks", next);
          }} />
          <Input placeholder="Rótulo" value={link.label ?? ""} onChange={(e) => {
            const next = [...links];
            next[i] = { ...next[i], label: e.target.value };
            update("socialLinks", next);
          }} />
          <Input placeholder="URL" value={link.url ?? ""} onChange={(e) => {
            const next = [...links];
            next[i] = { ...next[i], url: e.target.value };
            update("socialLinks", next);
          }} />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => update("socialLinks", [...links, { network: "", url: "" }])}>
        Adicionar rede
      </Button>
    </div>
  );
}

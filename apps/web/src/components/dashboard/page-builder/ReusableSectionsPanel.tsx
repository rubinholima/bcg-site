"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HomeContentBlock } from "@/types/home-content";
import {
  deleteReusableSection,
  listReusableSections,
  renameReusableSection,
  saveReusableSection,
} from "@/lib/page-builder/reusable-sections";

export function ReusableSectionsPanel({
  tenantId,
  selectedBlocks,
  onInsert,
}: {
  tenantId: string;
  selectedBlocks: HomeContentBlock[];
  onInsert: (blocks: HomeContentBlock[]) => void;
}) {
  const [name, setName] = useState("");
  const [tick, setTick] = useState(0);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const sections = listReusableSections(tenantId);

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Seções reutilizáveis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Nome da seção" value={name} onChange={(e) => setName(e.target.value)} />
          <Button
            type="button"
            size="sm"
            disabled={!name.trim() || !selectedBlocks.length}
            onClick={() => {
              saveReusableSection(tenantId, name, selectedBlocks);
              setName("");
              setTick((t) => t + 1);
            }}
          >
            Salvar
          </Button>
        </div>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm" key={tick}>
          {sections.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded border border-border/60 px-2 py-1">
              <span className="truncate">{s.name}</span>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" onClick={() => onInsert(s.blocks)}>
                  Inserir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRenameId(s.id);
                    setRenameValue(s.name);
                  }}
                >
                  Renomear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    deleteReusableSection(tenantId, s.id);
                    setTick((t) => t + 1);
                  }}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>

      <Dialog open={renameId != null} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear seção</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Nome" />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRenameId(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!renameValue.trim() || !renameId}
              onClick={() => {
                if (renameId && renameValue.trim()) {
                  renameReusableSection(tenantId, renameId, renameValue.trim());
                  setTick((t) => t + 1);
                }
                setRenameId(null);
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, FileWarning, Loader2, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  getPlayerDocumentTypeLabel,
  normalizeDocumentsProfile,
  PLAYER_DOCUMENT_TYPE_OPTIONS,
  type PlayerRegistrationDocument,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";
import { ExpandableSection } from "./ExpandableSection";

interface PlayerDocumentsSectionProps {
  playerId: string;
  profile: PlayerRegistrationProfile;
  onProfileChange: (next: PlayerRegistrationProfile) => void;
}

function formatDocumentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  pessoal: "Documentos pessoais",
  contrato: "Contratos e anexos",
  medico: "Documentos médicos",
  outro: "Outros",
};

function getCategoryLabel(category?: string): string {
  if (!category) return CATEGORY_LABELS.outro;
  return CATEGORY_LABELS[category] ?? CATEGORY_LABELS.outro;
}

function groupDocumentsByCategory(docs: PlayerRegistrationDocument[]) {
  const groups = new Map<string, PlayerRegistrationDocument[]>();
  for (const doc of docs) {
    const key = doc.documentCategory ?? "outro";
    const list = groups.get(key) ?? [];
    list.push(doc);
    groups.set(key, list);
  }
  const order = ["pessoal", "contrato", "medico", "outro"];
  return order
    .filter((key) => groups.has(key))
    .map((key) => ({
      key,
      label: getCategoryLabel(key),
      items: groups.get(key) ?? [],
    }));
}

export function PlayerDocumentsSection({
  playerId,
  profile,
  onProfileChange,
}: PlayerDocumentsSectionProps) {
  const documents = normalizeDocumentsProfile(profile.documents);
  const [search, setSearch] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<string>("rg");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) => {
      const haystack = [doc.name, getPlayerDocumentTypeLabel(doc.documentType), doc.uploadedAt]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [documents, search]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      ),
    [filtered],
  );

  const grouped = useMemo(() => groupDocumentsByCategory(sorted), [sorted]);

  const pendingCount = useMemo(
    () => documents.filter((d) => d.pendingDownload || !d.fileUrl?.trim()).length,
    [documents],
  );

  const beatscodeCount = useMemo(
    () => documents.filter((d) => d.source === "beatscode").length,
    [documents],
  );

  const updateDocuments = (next: PlayerRegistrationDocument[]) => {
    onProfileChange({ ...profile, documents: next });
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setUploadError("Selecione um arquivo.");
      return;
    }
    if (!uploadName.trim()) {
      setUploadError("Informe o nome do documento.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName.trim());
      formData.append("documentType", uploadType);

      const { data } = await api.postForm<PlayerRegistrationDocument>(
        `/players/${playerId}/registration-documents`,
        formData,
      );

      updateDocuments([data, ...documents]);
      setUploadName("");
      setUploadType("rg");
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (id: string) => {
    updateDocuments(documents.filter((d) => d.id !== id));
  };

  const handleView = (doc: PlayerRegistrationDocument) => {
    if (!doc.fileUrl?.trim()) return;
    const url = getPublicImageUrl(doc.fileUrl);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <ExpandableSection
      title="Documentos"
      description="Arquivos e documentos do atleta"
      badge={documents.length || undefined}
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 sm:p-5">
          <p className="mb-4 text-sm font-medium text-foreground">Enviar documento</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome do documento</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Ex: Registro Geral"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAYER_DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                className="text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          {uploadError && (
            <p className="mt-3 text-sm text-destructive">{uploadError}</p>
          )}
          <Button
            type="button"
            className="mt-4"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar documento
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Todos os documentos</p>
              {(beatscodeCount > 0 || pendingCount > 0) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {beatscodeCount > 0 && `${beatscodeCount} do Beatscode`}
                  {beatscodeCount > 0 && pendingCount > 0 && " · "}
                  {pendingCount > 0 && (
                    <span className="text-amber-400">
                      {pendingCount} aguardando arquivo (rode sync local)
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar"
                className="pl-9"
              />
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="rounded-lg border py-8 text-center text-muted-foreground">
              Não há dados
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label} ({group.items.length})
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Origem</TableHead>
                          <TableHead className="w-24 text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((doc) => {
                          const canView = Boolean(doc.fileUrl?.trim());
                          const isPending = doc.pendingDownload || !canView;
                          return (
                            <TableRow key={doc.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDocumentDate(doc.uploadedAt)}
                              </TableCell>
                              <TableCell>
                                <span className="line-clamp-2">{doc.name}</span>
                              </TableCell>
                              <TableCell>
                                {getPlayerDocumentTypeLabel(doc.documentType)}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {doc.source === "beatscode" && (
                                    <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                                      Beatscode
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                                      <FileWarning className="h-3 w-3" />
                                      Pendente
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title={canView ? "Visualizar" : "Arquivo ainda não baixado"}
                                    disabled={!canView}
                                    onClick={() => handleView(doc)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Remover"
                                    onClick={() => handleRemove(doc.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpandableSection>
  );
}

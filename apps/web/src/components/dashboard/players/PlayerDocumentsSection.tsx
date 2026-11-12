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
  basenameFromFilename,
  formatDocumentDisplayName,
  getPlayerDocumentTypeLabel,
  isDocumentPendingFile,
  normalizeDocumentsProfile,
  PLAYER_DOCUMENT_TYPE_OPTIONS,
  type PlayerRegistrationDocument,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";
import { ExpandableSection } from "./ExpandableSection";

const UPLOAD_TYPE_AUTO = "__auto__";

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
  const [uploadType, setUploadType] = useState<string>(UPLOAD_TYPE_AUTO);
  const [uploadCustomType, setUploadCustomType] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((doc) => {
      const haystack = [
        doc.name,
        formatDocumentDisplayName(doc),
        getPlayerDocumentTypeLabel(doc.documentType),
        doc.uploadedAt,
      ]
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
    () => documents.filter((d) => isDocumentPendingFile(d)).length,
    [documents],
  );

  const updateDocuments = (next: PlayerRegistrationDocument[]) => {
    onProfileChange({ ...profile, documents: next });
  };

  const resetUploadForm = () => {
    setUploadName("");
    setUploadType(UPLOAD_TYPE_AUTO);
    setUploadCustomType("");
    setUploadFiles([]);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resolveDocumentTypeForUpload = (): string | undefined => {
    if (uploadType === UPLOAD_TYPE_AUTO) return undefined;
    if (uploadType === "outro") {
      const custom = uploadCustomType.trim();
      return custom ? custom.toLowerCase().replace(/\s+/g, "_") : undefined;
    }
    return uploadType;
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      setUploadError("Selecione um ou mais arquivos.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress({ done: 0, total: uploadFiles.length });

    const typeOverride = resolveDocumentTypeForUpload();
    const uploaded: PlayerRegistrationDocument[] = [];
    const failures: string[] = [];
    let clearProgressAfter = true;

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]!;
        const formData = new FormData();
        formData.append("file", file);
        const displayName =
          uploadFiles.length === 1 && uploadName.trim()
            ? uploadName.trim()
            : basenameFromFilename(file.name);
        formData.append("name", displayName);
        if (typeOverride) formData.append("documentType", typeOverride);

        try {
          const { data } = await api.postForm<PlayerRegistrationDocument>(
            `/players/${playerId}/registration-documents`,
            formData,
          );
          uploaded.push(data);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro ao enviar";
          failures.push(`${file.name}: ${msg}`);
        }
        setUploadProgress({ done: i + 1, total: uploadFiles.length });
      }

      if (uploaded.length > 0) {
        updateDocuments([...uploaded, ...documents]);
      }

      if (failures.length === 0) {
        setUploadSuccess(
          uploaded.length === 1
            ? "1 documento enviado."
            : `${uploaded.length} documentos enviados.`,
        );
        resetUploadForm();
      } else if (uploaded.length > 0) {
        setUploadError(
          `${uploaded.length} enviado(s). Falha em ${failures.length}: ${failures.slice(0, 3).join(" · ")}${failures.length > 3 ? "…" : ""}`,
        );
        setUploadFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        clearProgressAfter = false;
      } else {
        setUploadError(failures.slice(0, 4).join(" · "));
        clearProgressAfter = false;
      }
    } finally {
      setUploading(false);
      if (clearProgressAfter) setUploadProgress(null);
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

  const onFilesSelected = (list: FileList | null) => {
    if (!list?.length) {
      setUploadFiles([]);
      return;
    }
    setUploadFiles(Array.from(list));
    setUploadError(null);
    setUploadSuccess(null);
  };

  return (
    <ExpandableSection
      title="Documentos"
      description="Arquivos e documentos do atleta"
      badge={documents.length || undefined}
    >
      <div className="space-y-6">
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 sm:p-5">
          <p className="mb-1 text-sm font-medium text-foreground">Enviar documentos</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Selecione vários PDFs ou imagens já nomeados no computador — o nome do arquivo vira o
            nome do documento.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Arquivos</Label>
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                className="min-h-[44px] text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-medium file:text-primary-foreground"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
              {uploadFiles.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {uploadFiles.length === 1
                    ? `1 arquivo: ${uploadFiles[0]!.name}`
                    : `${uploadFiles.length} arquivos selecionados`}
                </p>
              ) : null}
            </div>

            {uploadFiles.length === 1 ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome na ficha (opcional)</Label>
                <Input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder={basenameFromFilename(uploadFiles[0]!.name)}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Tipo (opcional)</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Automático pelo nome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UPLOAD_TYPE_AUTO}>Automático (nome do arquivo)</SelectItem>
                  {PLAYER_DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploadType === "outro" ? (
              <div className="space-y-2">
                <Label>Tipo personalizado</Label>
                <Input
                  value={uploadCustomType}
                  onChange={(e) => setUploadCustomType(e.target.value)}
                  placeholder="Ex.: Autorização dos pais"
                />
              </div>
            ) : null}
          </div>

          {uploadError && <p className="mt-3 text-sm text-destructive">{uploadError}</p>}
          {uploadSuccess && <p className="mt-3 text-sm text-emerald-500">{uploadSuccess}</p>}
          {uploadProgress && uploading ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Enviando {uploadProgress.done} de {uploadProgress.total}…
            </p>
          ) : null}

          <Button
            type="button"
            className="mt-4 min-h-[44px]"
            onClick={handleUpload}
            disabled={uploading || uploadFiles.length === 0}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {uploadFiles.length > 1
                  ? `Enviar ${uploadFiles.length} documentos`
                  : "Enviar documento"}
              </>
            )}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Todos os documentos</p>
              {pendingCount > 0 && (
                <p className="mt-1 text-xs text-amber-400">
                  {pendingCount === 1
                    ? "1 documento sem arquivo anexado"
                    : `${pendingCount} documentos sem arquivo anexado`}
                </p>
              )}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar"
                className="pl-9 min-h-[44px] sm:min-h-9"
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
                          <TableHead className="w-24 text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((doc) => {
                          const canView = Boolean(doc.fileUrl?.trim());
                          const isPending = isDocumentPendingFile(doc);
                          const displayName = doc.name?.trim() || formatDocumentDisplayName(doc);
                          return (
                            <TableRow key={doc.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDocumentDate(doc.uploadedAt)}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  <span className="line-clamp-2">{displayName}</span>
                                  {isPending && (
                                    <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-400">
                                      <FileWarning className="h-3 w-3 shrink-0" />
                                      Sem arquivo
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getPlayerDocumentTypeLabel(doc.documentType)}
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

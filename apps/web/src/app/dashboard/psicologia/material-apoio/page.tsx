"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { Tenant } from "@/types/tenant";

const CATEGORIES = [
  { value: "", label: "Todas as categorias" },
  { value: "protocolo", label: "Protocolo" },
  { value: "material", label: "Material" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "formulario", label: "Formulário" },
  { value: "outro", label: "Outro" },
] as const;

const UPLOAD_CATEGORIES = CATEGORIES.filter((c) => c.value !== "");

type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  categoryLabel: string | null;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  tenantId: string | null;
  tenantName: string | null;
  uploadedBy: string | null;
  createdAt: string;
};

const selectClassName =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fileIcon(row: MaterialRow) {
  const mime = row.mimeType ?? "";
  const name = row.fileName.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) {
    return FileImage;
  }
  if (/\.(xlsx?|csv)$/i.test(name) || mime.includes("spreadsheet") || mime.includes("excel")) {
    return FileSpreadsheet;
  }
  if (/\.(pptx?|ppt)$/i.test(name) || mime.includes("presentation")) {
    return Presentation;
  }
  return FileText;
}

export default function MaterialApoioPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [items, setItems] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterTenantId, setFilterTenantId] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategory, setUploadCategory] = useState("material");
  const [uploadTenantId, setUploadTenantId] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error" | "warning" | "info";
  }>({ open: false, title: "", message: "", variant: "info" });

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTenantId) params.set("tenantId", filterTenantId);
      if (filterCategory) params.set("category", filterCategory);
      if (filterSearch.trim()) params.set("search", filterSearch.trim());
      const qs = params.toString();
      const { data } = await api.get<MaterialRow[]>(
        `/psychology-support-materials${qs ? `?${qs}` : ""}`,
      );
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterTenantId, filterCategory, filterSearch]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    loadTenants();
  }, [authLoading, canAccessModule, loadTenants]);

  useEffect(() => {
    if (authLoading || !canAccessModule("saude")) return;
    loadItems();
  }, [authLoading, canAccessModule, loadItems]);

  useEffect(() => {
    if (!authLoading && !canAccessModule("saude")) {
      router.replace("/403");
    }
  }, [authLoading, canAccessModule, router]);

  const filteredCount = useMemo(() => items.length, [items]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle.trim());
      if (uploadDescription.trim()) formData.append("description", uploadDescription.trim());
      if (uploadCategory) formData.append("category", uploadCategory);
      if (uploadTenantId) formData.append("tenantId", uploadTenantId);
      await api.postForm("/psychology-support-materials", formData);
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setUploadCategory("material");
      setUploadTenantId("");
      setUploadFile(null);
      loadItems();
      setFeedback({
        open: true,
        title: "Material enviado",
        message: "O arquivo foi adicionado à biblioteca de apoio.",
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro ao enviar",
        message: err instanceof Error ? err.message : "Não foi possível enviar o arquivo.",
        variant: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/psychology-support-materials/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadItems();
      setFeedback({
        open: true,
        title: "Material excluído",
        message: "O arquivo foi removido da biblioteca.",
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro ao excluir",
        message: err instanceof Error ? err.message : "Não foi possível excluir o material.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/saude">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Saúde
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
          <FolderOpen className="h-6 w-6 shrink-0" />
          Material de apoio
        </h1>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Biblioteca compartilhada</CardTitle>
              <CardDescription>
                PDFs, imagens e documentos usados pela equipe de psicologia e estagiários.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => loadItems()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Enviar material
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="search-material">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-material"
                  className="pl-9 text-foreground"
                  placeholder="Título, descrição ou nome do arquivo…"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-category">Categoria</Label>
              <select
                id="filter-category"
                className={selectClassName}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value || "all"} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-tenant">Clube / empresa</Label>
              <select
                id="filter-tenant"
                className={selectClassName}
                value={filterTenantId}
                onChange={(e) => setFilterTenantId(e.target.value)}
              >
                <option value="">Todos</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCount === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum material encontrado. Clique em &quot;Enviar material&quot; para adicionar o primeiro.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((row) => {
                const Icon = fileIcon(row);
                const href = getPublicImageUrl(row.fileUrl);
                const isImage = (row.mimeType ?? "").startsWith("image/");
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 gap-3">
                      {isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={href}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40">
                          <Icon className="h-7 w-7 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground truncate">{row.title}</p>
                        {row.description ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">{row.description}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {row.categoryLabel ? <span>{row.categoryLabel}</span> : null}
                          {row.tenantName ? <span>{row.tenantName}</span> : null}
                          <span>{formatBytes(row.fileSizeBytes)}</span>
                          <span>{formatDate(row.createdAt)}</span>
                          {row.uploadedBy ? <span>por {row.uploadedBy}</span> : null}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{row.fileName}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2 self-end sm:self-center">
                      <Button variant="outline" size="sm" asChild>
                        <a href={href} target="_blank" rel="noopener noreferrer" download={row.fileName}>
                          <Download className="mr-2 h-4 w-4" />
                          Baixar
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpload}>
            <DialogHeader>
              <DialogTitle>Enviar material de apoio</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="upload-title">Título *</Label>
                <Input
                  id="upload-title"
                  className="text-foreground"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  required
                  placeholder="Ex.: Protocolo de acolhimento Sub-17"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upload-desc">Descrição</Label>
                <Input
                  id="upload-desc"
                  className="text-foreground"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Opcional — contexto ou instrução de uso"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-category">Categoria</Label>
                  <select
                    id="upload-category"
                    className={selectClassName}
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                  >
                    {UPLOAD_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-tenant">Clube / empresa</Label>
                  <select
                    id="upload-tenant"
                    className={selectClassName}
                    value={uploadTenantId}
                    onChange={(e) => setUploadTenantId(e.target.value)}
                  >
                    <option value="">Grupo (todos)</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upload-file">Arquivo *</Label>
                <Input
                  id="upload-file"
                  type="file"
                  className="text-foreground file:text-foreground"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                />
                <p className="text-xs text-muted-foreground">PDF, imagens ou Office — até 25 MB.</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading || !uploadFile || !uploadTitle.trim()}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir material?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `“${deleteTarget.title}” será removido permanentemente da biblioteca.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Download,
  Pencil,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { CONTRACT_TEMPLATE_TYPES } from "@/lib/contract-template-types";
import {
  CONTRACT_DATA_FIELD_CATALOG,
  CONTRACT_TEMPLATE_TYPE_LABELS,
  type ContractTemplateRow,
} from "@/lib/contract-templates";
import { Tenant } from "@/types/tenant";

const TEMPLATE_TYPES = CONTRACT_TEMPLATE_TYPES;

const selectClassName =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export default function ContratosBasePage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [templates, setTemplates] = useState<ContractTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mappingEdit, setMappingEdit] = useState<ContractTemplateRow | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("contrato_trabalho");
  const [uploadTenantId, setUploadTenantId] = useState("");
  const [uploadSignaturePage, setUploadSignaturePage] = useState("1");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}&includeInactive=true` : "?includeInactive=true";
      const { data } = await api.get<ContractTemplateRow[]>(`/contract-templates${qs}`);
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!canAccessModule("juridico") && !authLoading) return;
    loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    if (!canAccessModule("juridico")) return;
    loadTemplates();
  }, [canAccessModule, loadTemplates]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName.trim());
      formData.append("type", uploadType);
      if (uploadTenantId) formData.append("tenantId", uploadTenantId);
      formData.append("signaturePage", uploadSignaturePage);
      await api.post("/contract-templates", formData);
      setUploadOpen(false);
      setUploadName("");
      setUploadFile(null);
      loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao enviar modelo");
    } finally {
      setUploading(false);
    }
  };

  const openMapping = (row: ContractTemplateRow) => {
    setMappingEdit(row);
    setFieldMapping({ ...(row.fieldMapping ?? {}) });
  };

  const saveMapping = async () => {
    if (!mappingEdit) return;
    setSaving(true);
    try {
      await api.patch(`/contract-templates/${mappingEdit.id}`, { fieldMapping });
      setMappingEdit(null);
      loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar mapeamento");
    } finally {
      setSaving(false);
    }
  };

  const rescanFields = async (id: string) => {
    try {
      await api.post(`/contract-templates/${id}/rescan-fields`);
      loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao reler campos");
    }
  };

  const toggleActive = async (row: ContractTemplateRow) => {
    try {
      await api.patch(`/contract-templates/${row.id}`, { active: !row.active });
      loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar");
    }
  };

  const removeTemplate = async (id: string) => {
    if (!confirm("Excluir este modelo? Só é possível se não houver contratos gerados.")) return;
    try {
      await api.delete(`/contract-templates/${id}`);
      loadTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  if (!authLoading && !canAccessModule("juridico")) {
    router.replace("/dashboard");
    return null;
  }

  const pdfFields = mappingEdit
    ? Array.isArray(mappingEdit.pdfFieldNames)
      ? mappingEdit.pdfFieldNames
      : []
    : [];

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/juridico">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Jurídico
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Contratos base</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Modelos PDF (AcroForm)</CardTitle>
              <CardDescription>
                Um PDF por tipo (CLT, PJ, estágio, atleta, temporário…). Cada modelo tem campos próprios; o RH preenche no vínculo conforme o tipo de contrato.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo modelo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="filter-tenant">Filtrar por clube/empresa</Label>
            <select
              id="filter-tenant"
              className={selectClassName}
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">Todos (+ modelos globais)</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Campos PDF</TableHead>
                  <TableHead>Pág. assinatura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => {
                  const fieldCount = Array.isArray(t.pdfFieldNames) ? t.pdfFieldNames.length : 0;
                  const mappedCount = t.fieldMapping ? Object.keys(t.fieldMapping).length : 0;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{CONTRACT_TEMPLATE_TYPE_LABELS[t.type] ?? t.type}</TableCell>
                      <TableCell>{t.tenant?.name ?? "Global (todas)"}</TableCell>
                      <TableCell>
                        {fieldCount} detectados · {mappedCount} mapeados
                      </TableCell>
                      <TableCell>{t.signaturePage}</TableCell>
                      <TableCell>{t.active ? "Ativo" : "Inativo"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Mapear campos" onClick={() => openMapping(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Reler campos do PDF" onClick={() => rescanFields(t.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title={t.active ? "Desativar" : "Ativar"} onClick={() => toggleActive(t)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTemplate(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleUpload}>
            <DialogHeader>
              <DialogTitle>Enviar modelo de contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tpl-name">Nome do modelo *</Label>
                <Input id="tpl-name" value={uploadName} onChange={(e) => setUploadName(e.target.value.toUpperCase())} className="uppercase" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-type">Tipo</Label>
                <select id="tpl-type" className={selectClassName} value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
                  {TEMPLATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-tenant">Clube/empresa (vazio = global)</Label>
                <select id="tpl-tenant" className={selectClassName} value={uploadTenantId} onChange={(e) => setUploadTenantId(e.target.value)}>
                  <option value="">Global — todas as empresas</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-page">Página da assinatura</Label>
                <Input id="tpl-page" type="number" min={1} value={uploadSignaturePage} onChange={(e) => setUploadSignaturePage(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-file">PDF com campos AcroForm *</Label>
                <Input id="tpl-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} required />
                <p className="text-xs text-muted-foreground">
                  Use PDF editável (Adobe Acrobat / LibreOffice) com campos nomeados: nome_completo, cpf, cargo, salario, etc.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading || !uploadFile}>
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!mappingEdit} onOpenChange={(o) => !o && setMappingEdit(null)}>
        <DialogContent className="max-h-[min(90vh,calc(100dvh-2rem))] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mapeamento de campos — {mappingEdit?.name}</DialogTitle>
          </DialogHeader>
          {pdfFields.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum campo AcroForm detectado. Edite o PDF e adicione campos de formulário, depois clique em Reler campos.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              {pdfFields.map((pdfField) => (
                <div key={pdfField} className="grid gap-2 sm:grid-cols-2 sm:items-center">
                  <Label className="text-xs font-mono text-muted-foreground">{pdfField}</Label>
                  <select
                    className={selectClassName}
                    value={fieldMapping[pdfField] ?? ""}
                    onChange={(e) =>
                      setFieldMapping((prev) => ({
                        ...prev,
                        [pdfField]: e.target.value,
                      }))
                    }
                  >
                    <option value="">— Ignorar —</option>
                    {CONTRACT_DATA_FIELD_CATALOG.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMappingEdit(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveMapping} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

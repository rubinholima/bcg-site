"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";

const INPUT_CLASS = "text-foreground";

type Profile = Record<string, unknown>;

export function AssetInfrastructureTab({ assetId }: { assetId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({});
  const [interfaces, setInterfaces] = useState<Array<Record<string, unknown>>>([]);
  const [credentials, setCredentials] = useState<Array<Record<string, unknown>>>([]);
  const [backups, setBackups] = useState<Array<Record<string, unknown>>>([]);
  const [software, setSoftware] = useState<Array<Record<string, unknown>>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });
  const [credDialogOpen, setCredDialogOpen] = useState(false);
  const [credTitle, setCredTitle] = useState("");
  const [credUser, setCredUser] = useState("");
  const [credPass, setCredPass] = useState("");
  const [credSaving, setCredSaving] = useState(false);

  const notify = (title: string, message: string, variant: FeedbackVariant = "info") =>
    setFeedback({ open: true, title, message, variant });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{
        profile: Profile & {
          interfaces?: Array<Record<string, unknown>>;
          credentials?: Array<Record<string, unknown>>;
          backups?: Array<Record<string, unknown>>;
          softwareInstalls?: Array<Record<string, unknown>>;
          auditLogs?: Array<Record<string, unknown>>;
        };
      }>(`/infraestrutura/assets/${assetId}`);
      const p = data?.profile ?? {};
      setProfile(p);
      setInterfaces(Array.isArray(p.interfaces) ? p.interfaces : []);
      setCredentials(Array.isArray(p.credentials) ? p.credentials : []);
      setBackups(Array.isArray(p.backups) ? p.backups : []);
      setSoftware(Array.isArray(p.softwareInstalls) ? p.softwareInstalls : []);
      setAuditLogs(Array.isArray(p.auditLogs) ? p.auditLogs : []);
    } catch {
      notify("Erro", "Não foi possível carregar a ficha de infraestrutura.", "error");
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    void load();
  }, [load]);

  function setField(key: string, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.patch(`/infraestrutura/assets/${assetId}/profile`, profile);
      notify("Salvo", "Ficha técnica atualizada.", "success");
      await load();
    } catch {
      notify("Erro", "Falha ao salvar ficha técnica.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addInterface() {
    try {
      await api.post(`/infraestrutura/assets/${assetId}/interfaces`, {
        name: "ether1",
        type: "ethernet",
        speed: "1G",
        status: "up",
      });
      await load();
    } catch {
      notify("Erro", "Falha ao adicionar interface.", "error");
    }
  }

  async function submitCredential() {
    if (!credTitle.trim()) {
      notify("Atenção", "Informe o título da credencial.", "warning");
      return;
    }
    setCredSaving(true);
    try {
      await api.post(`/infraestrutura/assets/${assetId}/credentials`, {
        title: credTitle.trim(),
        username: credUser.trim() || undefined,
        password: credPass || undefined,
      });
      setCredDialogOpen(false);
      setCredTitle("");
      setCredUser("");
      setCredPass("");
      await load();
    } catch {
      notify("Erro", "Falha ao cadastrar credencial.", "error");
    } finally {
      setCredSaving(false);
    }
  }

  async function addCredential() {
    setCredDialogOpen(true);
  }

  async function revealCredential(id: string) {
    try {
      const { data } = await api.post<{ password: string }>(
        `/infraestrutura/assets/${assetId}/credentials/${id}/reveal`,
      );
      setRevealed((prev) => ({ ...prev, [id]: data?.password ?? "" }));
      setShowPass((prev) => ({ ...prev, [id]: true }));
    } catch {
      notify("Erro", "Não foi possível revelar a senha.", "error");
    }
  }

  async function copyCredential(id: string) {
    const pass = revealed[id];
    if (!pass) {
      await revealCredential(id);
      return;
    }
    try {
      await navigator.clipboard.writeText(pass);
      await api.post(`/infraestrutura/assets/${assetId}/credentials/${id}/copy-audit`);
      notify("Copiado", "Senha copiada para a área de transferência.", "success");
    } catch {
      notify("Erro", "Falha ao copiar senha.", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fields: Array<{ key: string; label: string }> = [
    { key: "hostname", label: "Hostname" },
    { key: "identity", label: "Identity" },
    { key: "ipAddress", label: "Endereço IP" },
    { key: "subnetMask", label: "Máscara" },
    { key: "gateway", label: "Gateway" },
    { key: "dns", label: "DNS" },
    { key: "macAddress", label: "MAC Address" },
    { key: "operatingSystem", label: "Sistema operacional" },
    { key: "firmware", label: "Firmware" },
    { key: "version", label: "Versão" },
    { key: "manufacturer", label: "Fabricante" },
    { key: "model", label: "Modelo" },
    { key: "serialNumber", label: "Número de série" },
    { key: "rackPositionU", label: "Posição U" },
    { key: "rackSide", label: "Frente / Traseira" },
    { key: "infraStatus", label: "Status" },
    { key: "vlan", label: "VLAN" },
    { key: "bridge", label: "Bridge" },
    { key: "bond", label: "Bond" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Dados técnicos</CardTitle>
          <Button type="button" size="sm" disabled={saving} onClick={() => void saveProfile()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input
                className={`mt-1 ${INPUT_CLASS}`}
                value={String(profile[f.key] ?? "")}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3">
            <Label className="text-xs text-muted-foreground">Observações técnicas</Label>
            <textarea
              className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              value={String(profile.technicalNotes ?? "")}
              onChange={(e) => setField("technicalNotes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Interfaces de rede</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => void addInterface()}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {interfaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma interface cadastrada.</p>
          ) : (
            interfaces.map((iface) => (
              <div
                key={String(iface.id)}
                className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm"
              >
                <span>
                  <strong>{String(iface.name)}</strong> · {String(iface.type)}
                  {iface.speed ? ` · ${String(iface.speed)}` : ""}
                  {iface.connectedTo ? ` → ${String(iface.connectedTo)}` : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Credenciais</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => void addCredential()}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma credencial vinculada.</p>
          ) : (
            credentials.map((c) => {
              const id = String(c.id);
              return (
                <div key={id} className="rounded border p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{String(c.title)}</p>
                      {c.username ? (
                        <p className="text-xs text-muted-foreground">Usuário: {String(c.username)}</p>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void revealCredential(id)}
                      >
                        {showPass[id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void copyCredential(id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {showPass[id] && revealed[id] ? (
                    <p className="font-mono text-sm break-all">{revealed[id]}</p>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de alterações</CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto space-y-2 text-sm">
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground">Sem registros ainda.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={String(log.id)} className="border-b border-border/50 pb-2">
                <p>
                  <span className="font-medium">{String(log.action)}</span> ·{" "}
                  {String(log.performedBy)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.createdAt ? new Date(String(log.createdAt)).toLocaleString("pt-BR") : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Topologia, backbone, racks e backups completos:{" "}
        <Link href="/dashboard/requisicoes/infraestrutura" className="text-primary hover:underline">
          módulo Infraestrutura
        </Link>
      </p>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />

      <Dialog open={credDialogOpen} onOpenChange={setCredDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova credencial</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Título</Label>
              <Input
                className={`mt-1 ${INPUT_CLASS}`}
                value={credTitle}
                onChange={(e) => setCredTitle(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <Input
                className={`mt-1 ${INPUT_CLASS}`}
                value={credUser}
                onChange={(e) => setCredUser(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Senha</Label>
              <Input
                type="password"
                className={`mt-1 ${INPUT_CLASS}`}
                value={credPass}
                onChange={(e) => setCredPass(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCredDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={credSaving} onClick={() => void submitCredential()}>
              {credSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

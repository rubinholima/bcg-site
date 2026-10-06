"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";
import { LOGISTICA_CADASTROS_BASE } from "@/lib/logistica-cadastros.config";
import { markSaveSuccessForNavigation, useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
import { useAuth } from "@/context/AuthContext";
import { isFootballKind } from "@/lib/home-data";

type UniformTypeOption = { id: string; name: string };
type ClothingOption = { id: string; name: string; imageUrl?: string | null };
type KitItemRow = { clothingItemId: string; sortOrder: number };

export type UniformKitDetail = {
  id: string;
  name: string;
  tenantId?: string | null;
  teamCategory?: string | null;
  uniformTypeId?: string | null;
  season?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  active?: boolean;
  isSystem?: boolean;
  items?: { clothingItemId: string; sortOrder: number; clothingItem?: ClothingOption }[];
};

type TenantOption = { id: string; name: string; kind?: { name: string }; categories?: string[] | null };

interface Props {
  mode: "create" | "edit";
  initial?: UniformKitDetail | null;
  tenantIdFromQuery?: string;
}

function isClubTenant(kindName: string | null | undefined): boolean {
  if (!kindName || !isFootballKind(kindName)) return false;
  const k = kindName.toLowerCase();
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

export function UniformKitFormClient({ mode, initial, tenantIdFromQuery }: Props) {
  const router = useRouter();
  const { isSuperAdmin } = useAuth();
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback("Kit salvo com sucesso.");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [uniformTypes, setUniformTypes] = useState<UniformTypeOption[]>([]);
  const [clothingItems, setClothingItems] = useState<ClothingOption[]>([]);

  const [tenantId, setTenantId] = useState(
    initial?.tenantId ?? tenantIdFromQuery ?? "",
  );
  const [teamCategory, setTeamCategory] = useState(initial?.teamCategory ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [uniformTypeId, setUniformTypeId] = useState(initial?.uniformTypeId ?? "");
  const [season, setSeason] = useState(initial?.season ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [active, setActive] = useState(initial?.active !== false);
  const [items, setItems] = useState<KitItemRow[]>(
    () =>
      initial?.items?.map((i, idx) => ({
        clothingItemId: i.clothingItemId,
        sortOrder: i.sortOrder ?? idx,
      })) ?? [],
  );
  const [addItemId, setAddItemId] = useState("");

  useEffect(() => {
    if (!tenantId) return;
    void api.get<TenantOption>(`/tenants/${tenantId}`).then(({ data }) => {
      if (data?.id) {
        setTenants((prev) => {
          if (prev.some((t) => t.id === data.id)) {
            return prev.map((t) => (t.id === data.id ? { ...t, ...data } : t));
          }
          return [...prev, data];
        });
      }
    });
  }, [tenantId]);

  useEffect(() => {
    void api.get<TenantOption[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list.filter((t) => isClubTenant(t.kind?.name)));
    });
    void api
      .get<UniformTypeOption[]>("/logistica-cadastros/uniform-types?activeOnly=true")
      .then(({ data }) => setUniformTypes(Array.isArray(data) ? data : []));
    void api
      .get<ClothingOption[]>("/logistica-cadastros/clothing-items?activeOnly=true")
      .then(({ data }) => setClothingItems(Array.isArray(data) ? data : []))
      .catch(() => setClothingItems([]));
  }, []);

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const categoryOptions = useMemo(() => {
    const raw = selectedTenant?.categories;
    if (!Array.isArray(raw)) return [];
    return raw.filter((c): c is string => typeof c === "string");
  }, [selectedTenant]);

  const listQs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
  const readOnly = mode === "edit" && (initial?.isSystem || !initial?.tenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setError(null);
    if (!tenantId && !isSuperAdmin) {
      setError("Selecione o clube.");
      return;
    }
    if (!name.trim()) {
      setError("Informe o nome do kit.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        tenantId: tenantId || null,
        teamCategory: teamCategory.trim() || null,
        name: name.trim(),
        uniformTypeId: uniformTypeId || undefined,
        season: season.trim() || undefined,
        imageUrl: imageUrl.trim() || null,
        description: description.trim() || undefined,
        active,
        items: items.map((i, idx) => ({
          clothingItemId: i.clothingItemId,
          sortOrder: idx,
        })),
      };
      if (mode === "create") {
        await api.post("/logistica-cadastros/uniform-kits", payload);
        markSaveSuccessForNavigation();
        notifySaved();
        router.push(`${LOGISTICA_CADASTROS_BASE}/kits-uniforme${listQs}${listQs ? "&" : "?"}success=true`);
      } else if (initial?.id) {
        await api.patch(`/logistica-cadastros/uniform-kits/${initial.id}`, payload);
        markSaveSuccessForNavigation();
        notifySaved();
        router.push(`${LOGISTICA_CADASTROS_BASE}/kits-uniforme${listQs}${listQs ? "&" : "?"}success=true`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!addItemId || items.some((i) => i.clothingItemId === addItemId)) return;
    setItems((prev) => [...prev, { clothingItemId: addItemId, sortOrder: prev.length }]);
    setAddItemId("");
  };

  const removeItem = (clothingItemId: string) => {
    setItems((prev) => prev.filter((i) => i.clothingItemId !== clothingItemId));
  };

  const imgPreview = imageUrl ? getPublicImageUrl(imageUrl) || imageUrl : null;

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Novo kit / uniforme" : "Editar kit / uniforme"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly ? (
            <p className="text-sm text-amber-400/90">Kit de sistema ou global — somente leitura.</p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Clube</Label>
              <NativeSelectField
                value={tenantId}
                disabled={readOnly || (mode === "edit" && !!initial?.tenantId)}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Selecione o clube…"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
            {categoryOptions.length > 0 ? (
              <div className="space-y-2">
                <Label>Categoria / elenco</Label>
                <NativeSelect
                  value={teamCategory}
                  disabled={readOnly}
                  onChange={(e) => setTeamCategory(e.target.value)}
                >
                  <option value="">Todas</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="kit-name">Nome</Label>
              <Input
                id="kit-name"
                required
                disabled={readOnly}
                className="min-h-[44px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de uniforme</Label>
              <NativeSelect
                value={uniformTypeId}
                disabled={readOnly}
                onChange={(e) => setUniformTypeId(e.target.value)}
              >
                <option value="">—</option>
                {uniformTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kit-season">Temporada</Label>
              <Input
                id="kit-season"
                disabled={readOnly}
                className="min-h-[44px] text-foreground"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={active}
                  disabled={readOnly}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Ativo
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              {imgPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgPreview}
                  alt=""
                  className="h-24 w-24 shrink-0 rounded-lg border object-cover"
                />
              ) : null}
              <MediaPicker
                sizeKey="card"
                allowAllFolders
                allowUpload
                allowClear
                disabled={readOnly || loading}
                value={imageUrl}
                onChange={setImageUrl}
                label="Biblioteca ou upload"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kit-desc">Descrição</Label>
            <Textarea
              id="kit-desc"
              disabled={readOnly}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Composição do kit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!readOnly ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label>Peça de vestuário</Label>
                <NativeSelect value={addItemId} onChange={(e) => setAddItemId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {clothingItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <Button type="button" variant="secondary" className="min-h-[44px]" onClick={addItem}>
                Adicionar peça
              </Button>
            </div>
          ) : null}
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma peça vinculada.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item, idx) => {
                const piece = clothingItems.find((c) => c.id === item.clothingItemId);
                const label = piece?.name ?? item.clothingItemId;
                return (
                  <li
                    key={item.clothingItemId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                  >
                    <span className="text-sm">
                      {idx + 1}. {label}
                    </span>
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.clothingItemId)}
                      >
                        Remover
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="min-h-[44px]" asChild>
          <Link href={`${LOGISTICA_CADASTROS_BASE}/kits-uniforme${listQs}`}>Cancelar</Link>
        </Button>
        {!readOnly ? (
          <Button type="submit" disabled={loading} className="min-h-[44px]">
            {loading ? "Salvando…" : "Salvar"}
          </Button>
        ) : null}
      </div>

      <SaveSuccessModal />
    </form>
  );
}

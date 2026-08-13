"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markSaveSuccessForNavigation, useSaveSuccessFeedback } from "@/hooks/use-save-success-feedback";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { api } from "@/lib/api";
import { toDateInputValue, type LogisticsLookupRow } from "@/lib/logistica-cadastros";
import {
  LOGISTICA_CADASTROS_BASE,
  type LogisticaCadastroResourceClient,
} from "@/lib/logistica-cadastros.config";

interface Props {
  resource: LogisticaCadastroResourceClient;
  mode: "create" | "edit";
  initial?: LogisticsLookupRow | null;
  tenantId?: string;
}

type ApiOption = { id: string; name: string };

const API_SELECT_PATHS: Record<string, string> = {
  "transport-companies": "/logistica-cadastros/transport-companies?activeOnly=true",
  "expense-categories": "/logistica-cadastros/expense-categories?activeOnly=true",
  "clothing-groups": "/logistica-cadastros/clothing-groups?activeOnly=true",
  "clothing-categories": "/logistica-cadastros/clothing-categories?activeOnly=true",
  "uniform-types": "/logistica-cadastros/uniform-types?activeOnly=true",
};

function fkInitialValue(
  initial: LogisticsLookupRow | null | undefined,
  fieldKey: string,
): string {
  if (fieldKey === "transportCompanyId") {
    return (initial?.transportCompanyId ?? initial?.transportCompany?.id ?? "") as string;
  }
  if (fieldKey === "categoryId") {
    return (initial?.categoryId ?? initial?.category?.id ?? "") as string;
  }
  if (fieldKey === "expenseCategoryId") {
    return (initial?.expenseCategoryId ?? initial?.expenseCategory?.id ?? "") as string;
  }
  if (fieldKey === "groupId") {
    return (initial?.groupId ?? initial?.group?.id ?? "") as string;
  }
  if (fieldKey === "uniformTypeId") {
    return (initial?.uniformTypeId ?? initial?.uniformType?.id ?? "") as string;
  }
  return "";
}

export function LogisticaCadastroFormClient({ resource, mode, initial, tenantId }: Props) {
  const router = useRouter();
  const { notifySaved, SaveSuccessModal } = useSaveSuccessFeedback();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiOptions, setApiOptions] = useState<Record<string, ApiOption[]>>({});
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const field of resource.fields) {
      const raw = initial?.[field.key as keyof LogisticsLookupRow];
      if (field.type === "date") {
        base[field.key] = toDateInputValue(raw as string | null);
      } else if (field.selectFromApi) {
        base[field.key] = fkInitialValue(initial, field.key);
      } else if (raw != null) {
        base[field.key] = String(raw);
      } else {
        base[field.key] = field.type === "number" ? "1" : "";
      }
    }
    return base;
  });

  useEffect(() => {
    const apiKeys = resource.fields
      .map((f) => f.selectFromApi)
      .filter((k): k is NonNullable<typeof k> => !!k);
    const unique = [...new Set(apiKeys)];
    if (unique.length === 0) return;

    void Promise.all(
      unique.map(async (key) => {
        const path = API_SELECT_PATHS[key];
        if (!path) return [key, []] as const;
        try {
          const { data } = await api.get<ApiOption[]>(path);
          return [key, Array.isArray(data) ? data : []] as const;
        } catch {
          return [key, []] as const;
        }
      }),
    ).then((entries) => {
      setApiOptions(Object.fromEntries(entries));
    });
  }, [resource.fields]);

  const basePath = `${LOGISTICA_CADASTROS_BASE}/${resource.slug}`;

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {};
    for (const field of resource.fields) {
      const val = values[field.key]?.trim() ?? "";
      if (field.required && !val) {
        setError(`Preencha o campo "${field.label}".`);
        setLoading(false);
        return;
      }
      if (field.type === "number") {
        body[field.key] = val ? Number(val) : undefined;
      } else if (field.type === "date") {
        body[field.key] = val || undefined;
      } else if (
        field.key === "transportCompanyId" ||
        field.key === "categoryId" ||
        field.key === "expenseCategoryId"
      ) {
        body[field.key] = val || null;
      } else {
        body[field.key] = val || undefined;
      }
    }

    if (resource.requiresTenant) {
      if (!tenantId) {
        setError("Selecione um clube antes de salvar.");
        setLoading(false);
        return;
      }
      body.tenantId = tenantId;
    }

    try {
      if (mode === "create") {
        const { data } = await api.post<{ id: string }>(`/logistica-cadastros/${resource.apiPath}`, body);
        if (data?.id) {
          markSaveSuccessForNavigation();
          const tenantQuery = tenantId ? `?tenantId=${tenantId}` : "";
          router.replace(`${basePath}/${data.id}/edit${tenantQuery}`);
          return;
        }
      } else if (initial?.id) {
        await api.patch(`/logistica-cadastros/${resource.apiPath}/${initial.id}`, body);
        notifySaved();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? `Novo ${resource.label.toLowerCase()}` : `Editar ${resource.label.toLowerCase()}`}
          </CardTitle>
          <CardDescription>{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
            )}

            {resource.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required ? " *" : ""}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.key}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                    rows={3}
                  />
                ) : field.type === "select" && field.selectFromApi ? (
                  <NativeSelect
                    id={field.key}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Selecione…</option>
                    {(apiOptions[field.selectFromApi] ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                ) : field.type === "select" && field.selectOptions ? (
                  <NativeSelect
                    id={field.key}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                    required={field.required}
                  >
                    <option value="">Selecione…</option>
                    {field.selectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </NativeSelect>
                ) : field.type === "date" ? (
                  <Input
                    id={field.key}
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                  />
                ) : field.type === "number" ? (
                  <Input
                    id={field.key}
                    type="number"
                    min={field.min ?? 0}
                    required={field.required}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === "email" ? "email" : "text"}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                  />
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-3 pt-4">
              <Button type="submit" disabled={loading} className="min-h-[44px]">
                {loading ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar"}
              </Button>
              <Link href={`${basePath}${tenantId ? `?tenantId=${tenantId}` : ""}`}>
                <Button type="button" variant="outline" disabled={loading} className="min-h-[44px]">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      <SaveSuccessModal />
    </div>
  );
}

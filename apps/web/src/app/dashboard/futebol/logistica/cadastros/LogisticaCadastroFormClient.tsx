"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  type LogisticaCadastroResource,
} from "@/lib/logistica-cadastros.config";

interface Props {
  resource: LogisticaCadastroResource;
  mode: "create" | "edit";
  initial?: LogisticsLookupRow | null;
  tenantId?: string;
}

export function LogisticaCadastroFormClient({ resource, mode, initial, tenantId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transportCompanies, setTransportCompanies] = useState<{ id: string; name: string }[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const field of resource.fields) {
      const raw = initial?.[field.key as keyof LogisticsLookupRow];
      if (field.type === "date") {
        base[field.key] = toDateInputValue(raw as string | null);
      } else if (field.key === "transportCompanyId") {
        base[field.key] = (initial?.transportCompanyId ?? initial?.transportCompany?.id ?? "") as string;
      } else if (raw != null) {
        base[field.key] = String(raw);
      } else {
        base[field.key] = field.type === "number" ? "1" : "";
      }
    }
    return base;
  });

  useEffect(() => {
    const needsTransport = resource.fields.some((f) => f.selectFromApi === "transport-companies");
    if (!needsTransport) return;
    api
      .get<{ id: string; name: string }[]>("/logistica-cadastros/transport-companies?activeOnly=true")
      .then(({ data }) => setTransportCompanies(Array.isArray(data) ? data : []))
      .catch(() => setTransportCompanies([]));
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
      } else if (field.key === "transportCompanyId") {
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
        await api.post(`/logistica-cadastros/${resource.apiPath}`, body);
      } else if (initial?.id) {
        await api.patch(`/logistica-cadastros/${resource.apiPath}/${initial.id}`, body);
      }
      router.push(`${basePath}?success=true${tenantId ? `&tenantId=${tenantId}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
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
                ) : field.type === "select" && field.selectFromApi === "transport-companies" ? (
                  <NativeSelect
                    id={field.key}
                    value={values[field.key] ?? ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Selecione…</option>
                    {transportCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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
                    type="text"
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
    </div>
  );
}

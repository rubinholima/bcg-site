"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { formatDateDayMonYear } from "@/lib/format-date";

interface InboxItem {
  uid: number;
  subject: string;
  from: string;
  date: string;
}

interface MessageDetail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  text?: string;
  html?: string;
}

export function EmailInboxClient({ tenantSlug }: { tenantSlug: string }) {
  const [list, setList] = useState<InboxItem[]>([]);
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/workmail/inbox?tenantSlug=${encodeURIComponent(tenantSlug)}`, {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          setError("auth");
          return null;
        }
        if (res.status === 404) {
          setError("no_account");
          return null;
        }
        if (res.status === 503) {
          setError("unavailable");
          return null;
        }
        if (!res.ok) throw new Error("Falha ao carregar lista");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setList(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  // Quando não autenticado: busca a URL do login WorkMail e redireciona para a tela de login do e-mail.
  useEffect(() => {
    if (error !== "auth") return;
    let cancelled = false;
    fetch(`/api/public/workmail-web-url?slug=${encodeURIComponent(tenantSlug)}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data: { url?: string | null }) => {
        if (cancelled) return;
        const url = data?.url?.trim();
        if (url) window.location.href = url;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [error, tenantSlug]);

  useEffect(() => {
    if (selectedUid == null) {
      setMessage(null);
      return;
    }
    let cancelled = false;
    setLoadingMessage(true);
    fetch(
      `/api/workmail/inbox/${selectedUid}?tenantSlug=${encodeURIComponent(tenantSlug)}`,
      { credentials: "include" },
    )
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setMessage(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessage(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, selectedUid]);

  if (error === "auth") {
    const cognitoLoginUrl = `/login?next=${encodeURIComponent(`/portfolio/${tenantSlug}/email`)}`;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-zinc-400">
        <Mail className="h-12 w-12 text-zinc-500" />
        <p>Redirecionando para a tela de login do e-mail…</p>
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
        <p className="text-sm text-zinc-500">
          Se não redirecionar,{" "}
          <Link href={cognitoLoginUrl} className="text-amber-400 hover:underline">
            entre na área restrita
          </Link>
          .
        </p>
      </div>
    );
  }

  if (error === "no_account") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-zinc-400">
        <Mail className="h-12 w-12 text-zinc-500" />
        <p>Este clube ainda não tem e-mail configurado.</p>
        <p className="text-sm text-zinc-500">
          A caixa de entrada estará disponível após a configuração pelo administrador.
        </p>
      </div>
    );
  }

  if (error === "unavailable") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-zinc-400">
        <Mail className="h-12 w-12 text-zinc-500" />
        <p>Caixa de entrada temporariamente indisponível.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-zinc-400">
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <aside className="flex w-80 shrink-0 flex-col border-r border-white/5 bg-zinc-900/30 overflow-hidden">
        <div className="shrink-0 border-b border-white/5 px-3 py-2 text-sm font-medium text-zinc-400">
          Caixa de entrada ({list.length})
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">Nenhuma mensagem.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {list.map((item) => (
                <li key={item.uid}>
                  <button
                    type="button"
                    onClick={() => setSelectedUid(item.uid)}
                    className={`w-full px-3 py-2.5 text-left text-sm transition hover:bg-white/5 ${
                      selectedUid === item.uid ? "bg-white/10 text-zinc-100" : "text-zinc-300"
                    }`}
                  >
                    <div className="truncate font-medium">{item.subject}</div>
                    <div className="truncate text-xs text-zinc-500">{item.from}</div>
                    <div className="text-xs text-zinc-600">
                      {item.date ? formatDateDayMonYear(item.date) : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        {selectedUid == null ? (
          <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
            Selecione uma mensagem
          </div>
        ) : loadingMessage ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : message ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-white/5 bg-zinc-900/30 px-4 py-3">
              <h2 className="text-lg font-semibold text-zinc-100">{message.subject}</h2>
              <p className="text-sm text-zinc-400">De: {message.from}</p>
              <p className="text-xs text-zinc-500">
                {message.date ? new Date(message.date).toLocaleString("pt-BR") : ""}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {message.html ? (
                <div
                  className="prose prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: message.html }}
                />
              ) : message.text ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-300">
                  {message.text}
                </pre>
              ) : (
                <p className="text-zinc-500">Sem conteúdo exibível.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
            Mensagem não encontrada
          </div>
        )}
      </div>
    </div>
  );
}

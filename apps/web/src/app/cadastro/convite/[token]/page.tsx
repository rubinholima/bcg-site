import Link from "next/link";
import type { Metadata } from "next";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { RegistrationInviteForm } from "./RegistrationInviteForm";

export interface PublicRegistrationInviteData {
  expired: boolean;
  reviewStatus: string | null;
  rejectionReason: string | null;
  canFill: boolean;
  pending: boolean;
  approved: boolean;
  submittedDocuments: unknown;
  subjectType: "player" | "employee";
  tenantName: string;
  name: string;
  birthDate?: string | null;
  nationality?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactEmail?: string | null;
  emergencyContactPhone?: string | null;
  personal?: Record<string, unknown>;
  address?: Record<string, unknown>;
  cpf?: string | null;
  rg?: string | null;
  email?: string | null;
  phone?: string | null;
  pisNumber?: string | null;
  voterTitle?: string | null;
  ctpsUrl?: string | null;
  pixKey?: string | null;
  photoUrl?: string | null;
  admissionMedicalExamDate?: string | null;
  admissionMedicalExamFileUrl?: string | null;
  dismissalMedicalExamDate?: string | null;
  dismissalMedicalExamFileUrl?: string | null;
  hasMinorChildren?: boolean;
  dependents?: unknown;
  notes?: string | null;
}

async function getInviteData(token: string): Promise<PublicRegistrationInviteData | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/registration-invite/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicRegistrationInviteData;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getInviteData(token);
  return {
    title: data ? `Cadastro — ${data.name}` : "Cadastro",
  };
}

export default async function RegistrationInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getInviteData(token);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg opacity-80">Link de cadastro inválido.</p>
        <Link href="/" className="mt-4 text-sm font-medium text-amber-400 hover:opacity-90">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  if (data.approved) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg font-medium">Cadastro aprovado</p>
        <p className="mt-2 text-center text-sm text-zinc-400">
          Obrigado, {data.name}. Seu cadastro foi confirmado pelo RH.
        </p>
      </div>
    );
  }

  if (data.pending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg font-medium">Aguardando aprovação</p>
        <p className="mt-2 max-w-md text-center text-sm text-zinc-400">
          Obrigado, {data.name}. Seus dados foram enviados e estão em análise pelo departamento de RH. Você será
          contactado se necessário.
        </p>
      </div>
    );
  }

  if (data.expired && !data.canFill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg opacity-80">Este link expirou.</p>
        <p className="mt-2 text-center text-sm text-zinc-400">Peça um novo link ao departamento responsável.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="container mx-auto max-w-2xl">
          <p className="text-xs uppercase tracking-wide text-amber-400/90">{data.tenantName}</p>
          <h1 className="mt-1 text-lg font-semibold sm:text-xl">Complete seu cadastro</h1>
          <p className="mt-1 text-sm text-zinc-400">{data.name}</p>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {data.reviewStatus === "rejected" && data.rejectionReason ? (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            <p className="font-medium">Cadastro recusado — corrija e envie novamente</p>
            <p className="mt-1 text-red-200/90">{data.rejectionReason}</p>
          </div>
        ) : null}
        <RegistrationInviteForm token={token} initial={data} />
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutWithNav } from "@/components/layout/LayoutWithNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { buildBackendUrl } from "@/lib/apiProxy";

/** Nome e logo vêm da API do Grupo Master (dashboard). */
async function getGroupMetadata(): Promise<{ name?: string; logoUrl?: string }> {
  try {
    const res = await fetch(buildBackendUrl("/group"), { cache: "no-store" });
    if (!res.ok) return {};
    const group = (await res.json()) as { name?: string | null; logoUrl?: string | null };
    return {
      name: group?.name && typeof group.name === "string" ? group.name : undefined,
      logoUrl: group?.logoUrl && typeof group.logoUrl === "string" ? group.logoUrl : undefined,
    };
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { name, logoUrl } = await getGroupMetadata();
  const siteName = name ?? "Boston City Group";
  return {
    title: siteName,
    description: `Portal ${siteName} — empresas, usuários, emails e configurações.`,
    icons: logoUrl
      ? { icon: "/api/public/group-favicon" }
      : { icon: "/favicon.ico" },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <LayoutWithNav>{children}</LayoutWithNav>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutWithNav } from "@/components/layout/LayoutWithNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

import { getAppBaseUrl } from "@/lib/apiProxy";

/** Nome e logo vêm da API do Grupo Master. Usa /api/public/group (fallback quando backend indisponível). */
async function getGroupMetadata(): Promise<{ name?: string; logoUrl?: string }> {
  try {
    const base = getAppBaseUrl();
    const res = await fetch(`${base}/api/public/group`, { cache: "no-store" });
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
  const { name } = await getGroupMetadata();
  const siteName = name ?? "Boston City Group";
  return {
    title: siteName,
    description: `Portal ${siteName} — empresas, usuários, emails e configurações.`,
    icons: {
      icon: [{ url: "/bcg-logo.png", type: "image/png", sizes: "32x32" }, { url: "/bcg-logo.png", type: "image/png", sizes: "192x192" }],
      shortcut: "/bcg-logo.png",
      apple: "/bcg-logo.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className={`${inter.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <LayoutWithNav>{children}</LayoutWithNav>
        </AuthProvider>
      </body>
    </html>
  );
}

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
import { buildPageFontsGoogleStylesheetUrl } from "@/lib/page-fonts";

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
      icon: [
        { url: "/cup360-logo.png", type: "image/png", sizes: "32x32" },
        { url: "/cup360-logo.png", type: "image/png", sizes: "192x192" },
      ],
      shortcut: "/cup360-logo.png",
      apple: "/cup360-logo.png",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="stylesheet" href={buildPageFontsGoogleStylesheetUrl()} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;if(p.indexOf('/dashboard')===0){var t=localStorage.getItem('cup360-dashboard-theme');var light=t==='light'||(t==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',!light);document.documentElement.classList.toggle('dashboard-theme-light',light);}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${geistMono.variable}`} suppressHydrationWarning>
        <AuthProvider>
          <LayoutWithNav>{children}</LayoutWithNav>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";

/**
 * Favicon do portfólio: SEMPRE o logo do tenant. URL dedicada /api/portfolio/[slug]/favicon
 * para não mudar e não ser sobrescrito.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const iconUrl = `/api/portfolio/${encodeURIComponent(slug)}/favicon`;
  return {
    icons: { icon: iconUrl },
  };
}

export default function PortfolioSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

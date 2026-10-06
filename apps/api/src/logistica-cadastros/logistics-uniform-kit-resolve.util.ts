import { PrismaService } from '../prisma/prisma.service';

export type ResolvedUniformKitPreview = {
  name: string;
  imageUrl: string | null;
  items: { name: string; imageUrl: string | null }[];
};

/** Resolve kit por ID (preferencial) ou nome (legado). */
export async function resolveUniformKitPreview(
  prisma: PrismaService,
  opts: {
    kitId?: string | null;
    kitName?: string | null;
  },
): Promise<ResolvedUniformKitPreview | null> {
  const id = opts.kitId?.trim();
  if (id) {
    const byId = await prisma.logisticsUniformKit.findUnique({
      where: { id },
      select: {
        name: true,
        imageUrl: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            clothingItem: { select: { name: true, imageUrl: true } },
          },
        },
      },
    });
    if (byId) {
      return {
        name: byId.name,
        imageUrl: byId.imageUrl,
        items: byId.items.map(({ clothingItem }) => clothingItem),
      };
    }
  }
  const kitName = opts.kitName?.trim();
  if (!kitName) return null;
  const kit = await prisma.logisticsUniformKit.findFirst({
    where: { name: kitName },
    select: {
      name: true,
      imageUrl: true,
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          clothingItem: { select: { name: true, imageUrl: true } },
        },
      },
    },
  });
  if (!kit) return null;
  return {
    name: kit.name,
    imageUrl: kit.imageUrl,
    items: kit.items.map(({ clothingItem }) => clothingItem),
  };
}

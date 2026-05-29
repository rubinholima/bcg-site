import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface UpsertUserInput {
  cognitoSub: string;
  email: string;
  name: string | null;
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findUserByCognitoSub(cognitoSub: string) {
    return this.prisma.user.findFirst({
      where: { OR: [{ cognitoSub }, { id: cognitoSub }] },
    });
  }

  async upsertUser(input: UpsertUserInput) {
    const existing = await this.prisma.user.findUnique({
      where: { cognitoSub: input.cognitoSub },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: input.email,
          name: input.name,
          updatedAt: new Date(),
        },
      });
    }

    const byEmail = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          cognitoSub: input.cognitoSub,
          name: input.name ?? byEmail.name,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.user.create({
      data: {
        cognitoSub: input.cognitoSub,
        email: input.email,
        name: input.name,
      },
    });
  }

  private static readonly SHORTCUT_SLOTS = 5;

  normalizeDashboardShortcuts(raw: unknown): (string | null)[] {
    const empty = Array.from({ length: MeService.SHORTCUT_SLOTS }, () => null as string | null);
    if (!Array.isArray(raw)) return empty;
    return empty.map((_, i) => {
      const v = raw[i];
      if (typeof v !== 'string' || !v.trim()) return null;
      const href = v.trim();
      if (!href.startsWith('/dashboard')) return null;
      return href;
    });
  }

  async getDashboardShortcuts(userId: string): Promise<{ slots: (string | null)[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { dashboardShortcuts: true },
    });
    return { slots: this.normalizeDashboardShortcuts(user?.dashboardShortcuts) };
  }

  async updateDashboardShortcuts(
    userId: string,
    slots: unknown,
  ): Promise<{ slots: (string | null)[] }> {
    const normalized = this.normalizeDashboardShortcuts(slots);
    await this.prisma.user.update({
      where: { id: userId },
      data: { dashboardShortcuts: normalized },
    });
    return { slots: normalized };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MANAGED_ROLES = [
  'company_admin',
  'editor',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
] as const;

export interface ModuleWithPermissions {
  slug: string;
  name: string;
  sortOrder: number;
  company_admin: boolean;
  editor: boolean;
  analista: boolean;
  diretoria: boolean;
  medico: boolean;
  psicologo: boolean;
}

function getRoleAccess(roles: { role: string; canAccess: boolean }[], role: string): boolean {
  return roles.find((r) => r.role === role)?.canAccess ?? false;
}

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de slugs que a role pode acessar. */
  async getSlugsForRole(role: string): Promise<string[]> {
    const rows = await this.prisma.moduleRole.findMany({
      where: {
        role,
        canAccess: true,
      },
      include: { module: true },
      orderBy: { module: { sortOrder: 'asc' } },
    });
    return rows.map((r) => r.module.slug);
  }

  /** Todos os módulos com permissões (super_admin sempre true). Apenas super_admin. */
  async getAllWithPermissions(): Promise<ModuleWithPermissions[]> {
    const modules = await this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { roles: true },
    });
    return modules.map((m) => ({
      slug: m.slug,
      name: m.name,
      sortOrder: m.sortOrder,
      company_admin: getRoleAccess(m.roles, 'company_admin'),
      editor: getRoleAccess(m.roles, 'editor'),
      analista: getRoleAccess(m.roles, 'analista'),
      diretoria: getRoleAccess(m.roles, 'diretoria'),
      medico: getRoleAccess(m.roles, 'medico'),
      psicologo: getRoleAccess(m.roles, 'psicologo'),
    }));
  }

  /** Atualiza permissões por slug. Apenas super_admin. */
  async updatePermissions(
    permissions: Record<
      string,
      {
        company_admin?: boolean;
        editor?: boolean;
        analista?: boolean;
        diretoria?: boolean;
        medico?: boolean;
        psicologo?: boolean;
      }
    >,
  ): Promise<void> {
    for (const [slug, perms] of Object.entries(permissions)) {
      const module = await this.prisma.module.findUnique({ where: { slug } });
      if (!module) continue;

      for (const role of MANAGED_ROLES) {
        const canAccess = perms[role];
        if (canAccess === undefined) continue;
        await this.prisma.moduleRole.upsert({
          where: {
            moduleId_role: { moduleId: module.id, role },
          },
          create: {
            moduleId: module.id,
            role,
            canAccess,
          },
          update: { canAccess },
        });
      }
    }
  }
}

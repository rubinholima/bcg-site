import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VaultEncryptionService } from '../vault/vault-encryption.service';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { isTechnologyAssetKind } from './infrastructure-tech-kinds';

function performerId(user: CognitoJwtPayload): string {
  return user.email ?? user.sub ?? 'unknown';
}

@Injectable()
export class InfrastructureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: VaultEncryptionService,
  ) {}

  private async assertTechAsset(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: { category: { select: { kind: true, name: true } } },
    });
    if (!asset) throw new NotFoundException('Patrimônio não encontrado');
    if (!isTechnologyAssetKind(asset.category.kind)) {
      throw new BadRequestException(
        'Este patrimônio não possui categoria tecnológica. Use categorias de informática, infraestrutura, audiovisual ou segurança.',
      );
    }
    return asset;
  }

  private async getOrCreateProfileId(assetId: string): Promise<string> {
    await this.assertTechAsset(assetId);
    const existing = await this.prisma.assetInfrastructureProfile.findUnique({
      where: { assetId },
      select: { id: true },
    });
    if (existing) return existing.id;
    const created = await this.prisma.assetInfrastructureProfile.create({
      data: { assetId },
    });
    return created.id;
  }

  private async auditProfile(
    profileId: string,
    user: CognitoJwtPayload,
    action: string,
    changes?: Record<string, unknown>,
    notes?: string,
  ) {
    await this.prisma.assetInfrastructureAuditLog.create({
      data: {
        profileId,
        performedBy: performerId(user),
        action,
        changes: changes as object | undefined,
        notes: notes ?? null,
      },
    });
  }

  async getDashboard(tenantId?: string) {
    const assetWhere = tenantId
      ? { tenantId, category: { kind: { in: ['it_equipment', 'infrastructure', 'audiovisual', 'security'] } } }
      : { category: { kind: { in: ['it_equipment', 'infrastructure', 'audiovisual', 'security'] } } };

    const [techAssets, withProfile, racks, topologyLinks, backboneFibers, backups, credentials] =
      await Promise.all([
        this.prisma.asset.count({ where: assetWhere }),
        this.prisma.assetInfrastructureProfile.count({
          where: tenantId ? { asset: { tenantId } } : undefined,
        }),
        this.prisma.infrastructureRack.count({ where: tenantId ? { tenantId } : undefined }),
        this.prisma.assetTopologyLink.count({ where: tenantId ? { tenantId } : undefined }),
        this.prisma.assetBackboneFiber.count({ where: tenantId ? { tenantId } : undefined }),
        this.prisma.assetInfrastructureBackup.count({
          where: tenantId ? { profile: { asset: { tenantId } } } : undefined,
        }),
        this.prisma.assetInfrastructureCredential.count({
          where: tenantId ? { profile: { asset: { tenantId } } } : undefined,
        }),
      ]);

    return {
      techAssets,
      withProfile,
      withoutProfile: Math.max(0, techAssets - withProfile),
      racks,
      topologyLinks,
      backboneFibers,
      backups,
      credentials,
    };
  }

  async listTechAssets(tenantId?: string) {
    return this.prisma.asset.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        category: { kind: { in: ['it_equipment', 'infrastructure', 'audiovisual', 'security'] } },
      },
      orderBy: [{ tenant: { name: 'asc' } }, { description: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, kind: true } },
        infrastructureProfile: {
          select: {
            id: true,
            hostname: true,
            ipAddress: true,
            infraStatus: true,
            rack: { select: { id: true, name: true } },
            rackPositionU: true,
          },
        },
      },
    });
  }

  async getAssetBundle(assetId: string) {
    const asset = await this.assertTechAsset(assetId);
    let profile = await this.prisma.assetInfrastructureProfile.findUnique({
      where: { assetId },
      include: {
        rack: true,
        interfaces: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
        documents: { orderBy: { createdAt: 'desc' } },
        backups: { orderBy: [{ isCurrent: 'desc' }, { backupDate: 'desc' }] },
        credentials: {
          orderBy: { title: 'asc' },
          select: {
            id: true,
            title: true,
            username: true,
            url: true,
            category: true,
            notes: true,
            lastChangedAt: true,
            responsibleName: true,
            vaultItemId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        softwareInstalls: { orderBy: { name: 'asc' } },
        disasterRecovery: true,
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!profile) {
      profile = await this.prisma.assetInfrastructureProfile.create({
        data: { assetId },
        include: {
          rack: true,
          interfaces: true,
          documents: true,
          backups: true,
          credentials: {
            select: {
              id: true,
              title: true,
              username: true,
              url: true,
              category: true,
              notes: true,
              lastChangedAt: true,
              responsibleName: true,
              vaultItemId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          softwareInstalls: true,
          disasterRecovery: true,
          auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
    }
    const links = await this.prisma.assetTopologyLink.findMany({
      where: { OR: [{ sourceAssetId: assetId }, { targetAssetId: assetId }] },
      include: {
        sourceAsset: { select: { id: true, description: true, tagNumber: true } },
        targetAsset: { select: { id: true, description: true, tagNumber: true } },
      },
    });
    return { asset, profile, topologyLinks: links };
  }

  async updateProfile(
    assetId: string,
    dto: Record<string, unknown>,
    user: CognitoJwtPayload,
  ) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const data: Record<string, unknown> = {};
    const fields = [
      'hostname',
      'identity',
      'ipAddress',
      'subnetMask',
      'gateway',
      'dns',
      'macAddress',
      'operatingSystem',
      'firmware',
      'version',
      'manufacturer',
      'model',
      'serialNumber',
      'rackId',
      'rackPositionU',
      'rackSide',
      'infraStatus',
      'vlan',
      'bridge',
      'bond',
      'technicalNotes',
      'monitoringNotes',
    ] as const;
    for (const f of fields) {
      if (dto[f] !== undefined) data[f] = dto[f];
    }
    const updated = await this.prisma.assetInfrastructureProfile.update({
      where: { id: profileId },
      data,
      include: { rack: true },
    });
    await this.auditProfile(profileId, user, 'UPDATE_PROFILE', data);
    return updated;
  }

  // --- Interfaces ---
  async listInterfaces(assetId: string) {
    const profileId = await this.getOrCreateProfileId(assetId);
    return this.prisma.assetNetworkInterface.findMany({
      where: { profileId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createInterface(assetId: string, dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const row = await this.prisma.assetNetworkInterface.create({
      data: {
        profileId,
        name: String(dto.name ?? '').trim(),
        type: String(dto.type ?? 'ethernet').trim(),
        speed: dto.speed ? String(dto.speed).trim() : null,
        status: dto.status ? String(dto.status).trim() : null,
        description: dto.description ? String(dto.description).trim() : null,
        connectedTo: dto.connectedTo ? String(dto.connectedTo).trim() : null,
        sortOrder: typeof dto.sortOrder === 'number' ? dto.sortOrder : 0,
      },
    });
    await this.auditProfile(profileId, user, 'CREATE_INTERFACE', { id: row.id, name: row.name });
    return row;
  }

  async updateInterface(
    assetId: string,
    interfaceId: string,
    dto: Record<string, unknown>,
    user: CognitoJwtPayload,
  ) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const existing = await this.prisma.assetNetworkInterface.findFirst({
      where: { id: interfaceId, profileId },
    });
    if (!existing) throw new NotFoundException('Interface não encontrada');
    const row = await this.prisma.assetNetworkInterface.update({
      where: { id: interfaceId },
      data: {
        ...(dto.name !== undefined && { name: String(dto.name).trim() }),
        ...(dto.type !== undefined && { type: String(dto.type).trim() }),
        ...(dto.speed !== undefined && { speed: dto.speed ? String(dto.speed).trim() : null }),
        ...(dto.status !== undefined && { status: dto.status ? String(dto.status).trim() : null }),
        ...(dto.description !== undefined && {
          description: dto.description ? String(dto.description).trim() : null,
        }),
        ...(dto.connectedTo !== undefined && {
          connectedTo: dto.connectedTo ? String(dto.connectedTo).trim() : null,
        }),
        ...(dto.sortOrder !== undefined &&
          typeof dto.sortOrder === 'number' && { sortOrder: dto.sortOrder }),
      },
    });
    await this.auditProfile(profileId, user, 'UPDATE_INTERFACE', { id: row.id });
    return row;
  }

  async removeInterface(assetId: string, interfaceId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const existing = await this.prisma.assetNetworkInterface.findFirst({
      where: { id: interfaceId, profileId },
    });
    if (!existing) throw new NotFoundException('Interface não encontrada');
    await this.prisma.assetNetworkInterface.delete({ where: { id: interfaceId } });
    await this.auditProfile(profileId, user, 'DELETE_INTERFACE', { id: interfaceId });
    return { ok: true };
  }

  // --- Topology ---
  async listTopology(tenantId?: string) {
    return this.prisma.assetTopologyLink.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        sourceAsset: {
          select: {
            id: true,
            description: true,
            tagNumber: true,
            infrastructureProfile: { select: { hostname: true } },
          },
        },
        targetAsset: {
          select: {
            id: true,
            description: true,
            tagNumber: true,
            infrastructureProfile: { select: { hostname: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTopologyLink(dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const tenantId = String(dto.tenantId ?? '').trim();
    const sourceAssetId = String(dto.sourceAssetId ?? '').trim();
    const targetAssetId = String(dto.targetAssetId ?? '').trim();
    if (!tenantId || !sourceAssetId || !targetAssetId) {
      throw new BadRequestException('tenantId, sourceAssetId e targetAssetId são obrigatórios');
    }
    if (sourceAssetId === targetAssetId) {
      throw new BadRequestException('Origem e destino devem ser diferentes');
    }
    await this.assertTechAsset(sourceAssetId);
    await this.assertTechAsset(targetAssetId);
    return this.prisma.assetTopologyLink.create({
      data: {
        tenantId,
        sourceAssetId,
        targetAssetId,
        connectionType: String(dto.connectionType ?? 'fibra').trim(),
        speed: dto.speed ? String(dto.speed).trim() : null,
        length: dto.length ? String(dto.length).trim() : null,
        notes: dto.notes ? String(dto.notes).trim() : null,
      },
      include: {
        sourceAsset: { select: { id: true, description: true } },
        targetAsset: { select: { id: true, description: true } },
      },
    });
  }

  async removeTopologyLink(id: string) {
    await this.prisma.assetTopologyLink.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Conexão não encontrada');
    });
    return { ok: true };
  }

  // --- Backbone ---
  async listBackbone(tenantId?: string) {
    return this.prisma.assetBackboneFiber.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        equipmentAsset: { select: { id: true, description: true, tagNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBackbone(dto: Record<string, unknown>) {
    const tenantId = String(dto.tenantId ?? '').trim();
    const origin = String(dto.origin ?? '').trim();
    const destination = String(dto.destination ?? '').trim();
    if (!tenantId || !origin || !destination) {
      throw new BadRequestException('tenantId, origin e destination são obrigatórios');
    }
    return this.prisma.assetBackboneFiber.create({
      data: {
        tenantId,
        origin,
        destination,
        equipmentAssetId: dto.equipmentAssetId ? String(dto.equipmentAssetId).trim() : null,
        port: dto.port ? String(dto.port).trim() : null,
        fiberType: dto.fiberType ? String(dto.fiberType).trim() : null,
        speed: dto.speed ? String(dto.speed).trim() : null,
        status: dto.status ? String(dto.status).trim() : null,
        photoUrls: dto.photoUrls ?? undefined,
        notes: dto.notes ? String(dto.notes).trim() : null,
      },
    });
  }

  async updateBackbone(id: string, dto: Record<string, unknown>) {
    return this.prisma.assetBackboneFiber.update({
      where: { id },
      data: {
        ...(dto.origin !== undefined && { origin: String(dto.origin).trim() }),
        ...(dto.destination !== undefined && { destination: String(dto.destination).trim() }),
        ...(dto.equipmentAssetId !== undefined && {
          equipmentAssetId: dto.equipmentAssetId ? String(dto.equipmentAssetId).trim() : null,
        }),
        ...(dto.port !== undefined && { port: dto.port ? String(dto.port).trim() : null }),
        ...(dto.fiberType !== undefined && {
          fiberType: dto.fiberType ? String(dto.fiberType).trim() : null,
        }),
        ...(dto.speed !== undefined && { speed: dto.speed ? String(dto.speed).trim() : null }),
        ...(dto.status !== undefined && { status: dto.status ? String(dto.status).trim() : null }),
        ...(dto.photoUrls !== undefined && { photoUrls: dto.photoUrls as object }),
        ...(dto.notes !== undefined && { notes: dto.notes ? String(dto.notes).trim() : null }),
      },
    });
  }

  async removeBackbone(id: string) {
    await this.prisma.assetBackboneFiber.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Fibra não encontrada');
    });
    return { ok: true };
  }

  // --- Racks ---
  async listRacks(tenantId?: string) {
    return this.prisma.infrastructureRack.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        profiles: {
          include: {
            asset: { select: { id: true, description: true, tagNumber: true } },
          },
          orderBy: { rackPositionU: 'asc' },
        },
      },
    });
  }

  async createRack(dto: Record<string, unknown>) {
    const tenantId = String(dto.tenantId ?? '').trim();
    const name = String(dto.name ?? '').trim();
    if (!tenantId || !name) throw new BadRequestException('tenantId e name são obrigatórios');
    return this.prisma.infrastructureRack.create({
      data: {
        tenantId,
        name,
        location: dto.location ? String(dto.location).trim() : null,
        totalUnits: typeof dto.totalUnits === 'number' ? dto.totalUnits : 42,
        notes: dto.notes ? String(dto.notes).trim() : null,
      },
    });
  }

  async updateRack(id: string, dto: Record<string, unknown>) {
    return this.prisma.infrastructureRack.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: String(dto.name).trim() }),
        ...(dto.location !== undefined && {
          location: dto.location ? String(dto.location).trim() : null,
        }),
        ...(dto.totalUnits !== undefined &&
          typeof dto.totalUnits === 'number' && { totalUnits: dto.totalUnits }),
        ...(dto.notes !== undefined && { notes: dto.notes ? String(dto.notes).trim() : null }),
      },
    });
  }

  async removeRack(id: string) {
    await this.prisma.infrastructureRack.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Rack não encontrado');
    });
    return { ok: true };
  }

  // --- Documents ---
  async createDocument(assetId: string, dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const row = await this.prisma.assetInfrastructureDocument.create({
      data: {
        profileId,
        name: String(dto.name ?? '').trim(),
        docType: String(dto.docType ?? 'outro').trim(),
        fileUrl: dto.fileUrl ? String(dto.fileUrl).trim() : null,
        fileKey: dto.fileKey ? String(dto.fileKey).trim() : null,
        uploadedBy: performerId(user),
      },
    });
    await this.auditProfile(profileId, user, 'CREATE_DOCUMENT', { id: row.id, name: row.name });
    return row;
  }

  async removeDocument(assetId: string, docId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    await this.prisma.assetInfrastructureDocument.deleteMany({ where: { id: docId, profileId } });
    await this.auditProfile(profileId, user, 'DELETE_DOCUMENT', { id: docId });
    return { ok: true };
  }

  // --- Backups ---
  async createBackup(assetId: string, dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    if (dto.isCurrent === true) {
      await this.prisma.assetInfrastructureBackup.updateMany({
        where: { profileId },
        data: { isCurrent: false },
      });
    }
    const row = await this.prisma.assetInfrastructureBackup.create({
      data: {
        profileId,
        backupType: String(dto.backupType ?? 'config').trim(),
        fileUrl: dto.fileUrl ? String(dto.fileUrl).trim() : null,
        fileKey: dto.fileKey ? String(dto.fileKey).trim() : null,
        version: dto.version ? String(dto.version).trim() : null,
        backupDate: dto.backupDate ? new Date(String(dto.backupDate)) : null,
        responsibleName: dto.responsibleName ? String(dto.responsibleName).trim() : null,
        comments: dto.comments ? String(dto.comments).trim() : null,
        isCurrent: dto.isCurrent === true,
      },
    });
    await this.auditProfile(profileId, user, 'CREATE_BACKUP', { id: row.id });
    return row;
  }

  async removeBackup(assetId: string, backupId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    await this.prisma.assetInfrastructureBackup.deleteMany({ where: { id: backupId, profileId } });
    await this.auditProfile(profileId, user, 'DELETE_BACKUP', { id: backupId });
    return { ok: true };
  }

  // --- Credentials ---
  async createCredential(assetId: string, dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const password = dto.password ? String(dto.password) : '';
    let secretEnc: string | null = null;
    let secretIv: string | null = null;
    if (password) {
      try {
        const enc = this.encryption.encrypt(password);
        secretEnc = enc.encrypted;
        secretIv = enc.iv;
      } catch {
        throw new ForbiddenException('Criptografia indisponível — configure VAULT_MASTER_KEY na API.');
      }
    }
    const row = await this.prisma.assetInfrastructureCredential.create({
      data: {
        profileId,
        title: String(dto.title ?? '').trim(),
        username: dto.username ? String(dto.username).trim() : null,
        secretEnc,
        secretIv,
        url: dto.url ? String(dto.url).trim() : null,
        category: dto.category ? String(dto.category).trim() : null,
        notes: dto.notes ? String(dto.notes).trim() : null,
        lastChangedAt: dto.lastChangedAt ? new Date(String(dto.lastChangedAt)) : new Date(),
        responsibleName: dto.responsibleName ? String(dto.responsibleName).trim() : performerId(user),
        vaultItemId: dto.vaultItemId ? String(dto.vaultItemId).trim() : null,
      },
    });
    await this.prisma.assetInfrastructureCredentialAuditLog.create({
      data: { credentialId: row.id, action: 'CREATE', performedBy: performerId(user) },
    });
    await this.auditProfile(profileId, user, 'CREATE_CREDENTIAL', { id: row.id, title: row.title });
    return { id: row.id, title: row.title, username: row.username, url: row.url, category: row.category };
  }

  async revealCredential(assetId: string, credentialId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const row = await this.prisma.assetInfrastructureCredential.findFirst({
      where: { id: credentialId, profileId },
    });
    if (!row) throw new NotFoundException('Credencial não encontrada');
    await this.prisma.assetInfrastructureCredentialAuditLog.create({
      data: { credentialId, action: 'REVEAL', performedBy: performerId(user) },
    });
    if (!row.secretEnc || !row.secretIv) return { password: '' };
    try {
      return { password: this.encryption.decrypt(row.secretEnc, row.secretIv) };
    } catch {
      throw new BadRequestException('Não foi possível descriptografar a senha.');
    }
  }

  async copyCredentialAudit(assetId: string, credentialId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const row = await this.prisma.assetInfrastructureCredential.findFirst({
      where: { id: credentialId, profileId },
    });
    if (!row) throw new NotFoundException('Credencial não encontrada');
    await this.prisma.assetInfrastructureCredentialAuditLog.create({
      data: { credentialId, action: 'COPY', performedBy: performerId(user) },
    });
    return { ok: true };
  }

  async removeCredential(assetId: string, credentialId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    await this.prisma.assetInfrastructureCredentialAuditLog.create({
      data: { credentialId, action: 'DELETE', performedBy: performerId(user) },
    }).catch(() => undefined);
    await this.prisma.assetInfrastructureCredential.deleteMany({
      where: { id: credentialId, profileId },
    });
    await this.auditProfile(profileId, user, 'DELETE_CREDENTIAL', { id: credentialId });
    return { ok: true };
  }

  // --- Software installs (relação patrimônio ↔ software, sem módulo duplicado) ---
  async createSoftwareInstall(assetId: string, dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const row = await this.prisma.assetSoftwareInstall.create({
      data: {
        profileId,
        name: String(dto.name ?? '').trim(),
        version: dto.version ? String(dto.version).trim() : null,
        licenseKey: dto.licenseKey ? String(dto.licenseKey).trim() : null,
        licenseRef: dto.licenseRef ? String(dto.licenseRef).trim() : null,
        installedAt: dto.installedAt ? new Date(String(dto.installedAt)) : null,
        notes: dto.notes ? String(dto.notes).trim() : null,
      },
    });
    await this.auditProfile(profileId, user, 'CREATE_SOFTWARE', { id: row.id, name: row.name });
    return row;
  }

  async removeSoftwareInstall(assetId: string, installId: string, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    await this.prisma.assetSoftwareInstall.deleteMany({ where: { id: installId, profileId } });
    await this.auditProfile(profileId, user, 'DELETE_SOFTWARE', { id: installId });
    return { ok: true };
  }

  // --- Disaster Recovery ---
  async upsertDisasterRecovery(assetId: string, dto: Record<string, unknown>, user: CognitoJwtPayload) {
    const profileId = await this.getOrCreateProfileId(assetId);
    const row = await this.prisma.assetDisasterRecoveryPlan.upsert({
      where: { profileId },
      create: {
        profileId,
        checklist: dto.checklist as object | undefined,
        procedure: dto.procedure ? String(dto.procedure) : null,
        estimatedTime: dto.estimatedTime ? String(dto.estimatedTime).trim() : null,
        prerequisites: dto.prerequisites ? String(dto.prerequisites) : null,
        relatedFiles: dto.relatedFiles as object | undefined,
        backupRefs: dto.backupRefs as object | undefined,
        notes: dto.notes ? String(dto.notes).trim() : null,
      },
      update: {
        ...(dto.checklist !== undefined && { checklist: dto.checklist as object }),
        ...(dto.procedure !== undefined && { procedure: dto.procedure ? String(dto.procedure) : null }),
        ...(dto.estimatedTime !== undefined && {
          estimatedTime: dto.estimatedTime ? String(dto.estimatedTime).trim() : null,
        }),
        ...(dto.prerequisites !== undefined && {
          prerequisites: dto.prerequisites ? String(dto.prerequisites) : null,
        }),
        ...(dto.relatedFiles !== undefined && { relatedFiles: dto.relatedFiles as object }),
        ...(dto.backupRefs !== undefined && { backupRefs: dto.backupRefs as object }),
        ...(dto.notes !== undefined && { notes: dto.notes ? String(dto.notes).trim() : null }),
      },
    });
    await this.auditProfile(profileId, user, 'UPSERT_DR', { profileId });
    return row;
  }
}

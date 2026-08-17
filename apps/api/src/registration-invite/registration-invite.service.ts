import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { MailService } from '../common/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { RejectRegistrationDto } from './dto/reject-registration.dto';
import { SubmittedDocumentDto } from './dto/submitted-document.dto';
import {
  employeeDocumentationPatch,
  normalizeDependentName,
} from '../rh/employee-documentation.util';
import { EmployeeAddressDto } from '../rh/dto/employee-address.dto';
import { SubmitEmployeeRegistrationDto } from './dto/submit-employee-registration.dto';
import { SubmitPlayerRegistrationDto } from './dto/submit-player-registration.dto';

const DEFAULT_EXPIRES_DAYS = 30;

export interface CreateInviteResult {
  id: string;
  token: string;
  url: string;
  expiresAt: string | null;
  emailSent: boolean;
  emailError?: string;
  noContact?: boolean;
  contactPhone: string | null;
  whatsappMessage: string;
}

function publicAppBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://www.bostoncitygroup.biz'
  ).replace(/\/$/, '');
}

function inviteUrl(token: string): string {
  return `${publicAppBaseUrl()}/cadastro/convite/${token}`;
}

function whatsappMessageFor(name: string, url: string): string {
  return [
    `Olá, ${name}!`,
    '',
    'Precisamos que você complete ou atualize seu cadastro.',
    '',
    'Acesse o link abaixo (válido por tempo limitado):',
    url,
    '',
    'Qualquer dúvida, fale com o departamento responsável.',
  ].join('\n');
}

function isExpired(invite: { expiresAt: Date | null }): boolean {
  return !!(invite.expiresAt && invite.expiresAt < new Date());
}

function canSubmit(invite: {
  expiresAt: Date | null;
  reviewStatus: string | null;
}): boolean {
  if (isExpired(invite)) return false;
  if (!invite.reviewStatus) return true;
  return invite.reviewStatus === 'rejected';
}

function mergeJson<T extends Record<string, unknown>>(
  base: unknown,
  patch: Record<string, unknown>,
): T {
  const current =
    base && typeof base === 'object' && !Array.isArray(base)
      ? (base as Record<string, unknown>)
      : {};
  return { ...current, ...patch } as T;
}

function employeeDocType(value: string): string {
  const map: Record<string, string> = {
    rg: 'RG',
    cpf: 'CPF',
    ctps: 'CTPS',
    exame_admissional: 'exame_admissional',
    exame_demissional: 'exame_demissional',
    reservista: 'reservista',
    certidao: 'certidao',
    comprovante_residencia: 'comprovante_residencia',
    documento_esportivo: 'documento_esportivo',
    outro: 'outro',
  };
  return map[value] ?? value;
}

@Injectable()
export class RegistrationInviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly s3: S3Service,
  ) {}

  async createForPlayer(
    playerId: string,
    options?: { sendEmail?: boolean; expiresInDays?: number; createdByUserId?: string },
  ): Promise<CreateInviteResult> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        contactEmail: true,
        contactPhone: true,
      },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');

    return this.createInvite({
      tenantId: player.tenantId,
      subjectType: 'player',
      playerId: player.id,
      name: player.name,
      email: player.contactEmail,
      phone: player.contactPhone,
      sendEmail: options?.sendEmail,
      expiresInDays: options?.expiresInDays,
      createdByUserId: options?.createdByUserId,
    });
  }

  async createForEmployee(
    employeeId: string,
    options?: { sendEmail?: boolean; expiresInDays?: number; createdByUserId?: string },
  ): Promise<CreateInviteResult> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
      },
    });
    if (!employee) throw new NotFoundException('Colaborador não encontrado');

    return this.createInvite({
      tenantId: employee.tenantId,
      subjectType: 'employee',
      employeeId: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      sendEmail: options?.sendEmail,
      expiresInDays: options?.expiresInDays,
      createdByUserId: options?.createdByUserId,
    });
  }

  private async createInvite(input: {
    tenantId: string;
    subjectType: 'player' | 'employee';
    playerId?: string;
    employeeId?: string;
    name: string;
    email: string | null | undefined;
    phone: string | null | undefined;
    sendEmail?: boolean;
    expiresInDays?: number;
    createdByUserId?: string;
  }): Promise<CreateInviteResult> {
    const days = input.expiresInDays ?? DEFAULT_EXPIRES_DAYS;
    const expiresAt =
      days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
    const token = randomBytes(16).toString('hex');

    await this.prisma.registrationInvite.updateMany({
      where: {
        reviewStatus: { not: 'approved' },
        ...(input.playerId ? { playerId: input.playerId } : {}),
        ...(input.employeeId ? { employeeId: input.employeeId } : {}),
      },
      data: { expiresAt: new Date() },
    });

    const created = await this.prisma.registrationInvite.create({
      data: {
        token,
        tenantId: input.tenantId,
        subjectType: input.subjectType,
        playerId: input.playerId ?? null,
        employeeId: input.employeeId ?? null,
        expiresAt,
        createdByUserId: input.createdByUserId ?? null,
      },
    });

    const url = inviteUrl(created.token);
    const whatsappMessage = whatsappMessageFor(input.name, url);

    let emailSent = false;
    let emailError: string | undefined;
    let noContact = false;

    if (input.sendEmail) {
      const to = input.email?.trim();
      if (!to) {
        noContact = true;
      } else {
        const result = await this.mail.sendMail({
          to,
          subject: 'Complete seu cadastro — Boston City Group',
          text: whatsappMessage,
        });
        emailSent = result.sent;
        emailError = result.error;
      }
    }

    return {
      id: created.id,
      token: created.token,
      url,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      emailSent,
      emailError,
      noContact,
      contactPhone: input.phone?.trim() || null,
      whatsappMessage,
    };
  }

  async uploadDocument(
    token: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    name: string,
    documentType: string,
  ) {
    const invite = await this.requireSubmittableInvite(token);
    if (!name?.trim()) throw new BadRequestException('Nome do documento é obrigatório');
    if (!documentType?.trim()) throw new BadRequestException('Tipo do documento é obrigatório');

    const lower = file.originalname?.toLowerCase() ?? '';
    const allowed =
      lower.endsWith('.pdf') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.heic') ||
      lower.endsWith('.heif') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype?.startsWith('image/');
    if (!allowed) {
      throw new BadRequestException('Envie PDF ou imagem (PNG, JPG, WEBP).');
    }

    const uploaded = await this.s3.uploadRegistrationInviteDocument(
      file.buffer,
      invite.id,
      file.originalname || 'documento.pdf',
      file.mimetype,
    );

    return {
      id: randomUUID(),
      name: name.trim(),
      documentType: documentType.trim(),
      fileKey: uploaded.key,
      fileUrl: uploaded.url,
      uploadedAt: new Date().toISOString(),
    };
  }

  async getPublicForm(token: string) {
    const invite = await this.prisma.registrationInvite.findUnique({
      where: { token: token.trim() },
      include: {
        tenant: { select: { name: true } },
        player: {
          select: {
            name: true,
            birthDate: true,
            nationality: true,
            contactEmail: true,
            contactPhone: true,
            emergencyContactName: true,
            emergencyContactEmail: true,
            emergencyContactPhone: true,
            registrationProfile: true,
          },
        },
        employee: {
          select: {
            name: true,
            cpf: true,
            rg: true,
            email: true,
            phone: true,
            birthDate: true,
            address: true,
            pisNumber: true,
            voterTitle: true,
            ctpsUrl: true,
            pixKey: true,
            photoUrl: true,
            admissionMedicalExamDate: true,
            admissionMedicalExamFileUrl: true,
            dismissalMedicalExamDate: true,
            dismissalMedicalExamFileUrl: true,
            hasMinorChildren: true,
            notes: true,
            dependents: {
              orderBy: { birthDate: 'asc' },
              select: {
                name: true,
                birthDate: true,
                birthCertificateFileUrl: true,
                schoolAttendanceFileUrl: true,
                vaccinationCardFileUrl: true,
              },
            },
          },
        },
      },
    });

    if (!invite) return null;

    const expired = isExpired(invite);
    const reviewStatus = invite.reviewStatus;
    const canFill = canSubmit(invite);

    const base = {
      expired,
      reviewStatus,
      rejectionReason: invite.rejectionReason,
      canFill,
      pending: reviewStatus === 'pending',
      approved: reviewStatus === 'approved',
      submittedDocuments: Array.isArray(invite.submittedDocuments)
        ? invite.submittedDocuments
        : [],
      tenantName: invite.tenant.name,
    };

    const payload =
      invite.submittedPayload &&
      typeof invite.submittedPayload === 'object' &&
      !Array.isArray(invite.submittedPayload)
        ? (invite.submittedPayload as Record<string, unknown>)
        : null;

    if (invite.subjectType === 'player' && invite.player) {
      const profile =
        invite.player.registrationProfile &&
        typeof invite.player.registrationProfile === 'object'
          ? invite.player.registrationProfile
          : {};
      const personalFromProfile =
        profile &&
        typeof profile === 'object' &&
        'personal' in profile &&
        profile.personal &&
        typeof profile.personal === 'object'
          ? profile.personal
          : {};
      const addressFromProfile =
        profile &&
        typeof profile === 'object' &&
        'address' in profile &&
        profile.address &&
        typeof profile.address === 'object'
          ? profile.address
          : {};

      const personalPayload =
        payload?.personal && typeof payload.personal === 'object'
          ? payload.personal
          : {};
      const addressPayload =
        payload?.address && typeof payload.address === 'object' ? payload.address : {};

      return {
        ...base,
        subjectType: 'player' as const,
        name: invite.player.name,
        birthDate: (payload?.birthDate as string) ?? invite.player.birthDate,
        nationality: (payload?.nationality as string) ?? invite.player.nationality,
        contactEmail: (payload?.contactEmail as string) ?? invite.player.contactEmail,
        contactPhone: (payload?.contactPhone as string) ?? invite.player.contactPhone,
        emergencyContactName:
          (payload?.emergencyContactName as string) ?? invite.player.emergencyContactName,
        emergencyContactEmail:
          (payload?.emergencyContactEmail as string) ?? invite.player.emergencyContactEmail,
        emergencyContactPhone:
          (payload?.emergencyContactPhone as string) ?? invite.player.emergencyContactPhone,
        personal: canFill && reviewStatus === 'rejected' ? personalPayload : personalFromProfile,
        address: canFill && reviewStatus === 'rejected' ? addressPayload : addressFromProfile,
      };
    }

    if (invite.subjectType === 'employee' && invite.employee) {
      const emp = invite.employee;
      const preferPayload = canFill && reviewStatus === 'rejected';
      const dependentsFromDb = emp.dependents.map((d) => ({
        name: d.name,
        birthDate: d.birthDate.toISOString().slice(0, 10),
        birthCertificateFileUrl: d.birthCertificateFileUrl ?? '',
        schoolAttendanceFileUrl: d.schoolAttendanceFileUrl ?? '',
        vaccinationCardFileUrl: d.vaccinationCardFileUrl ?? '',
      }));
      const dependentsPayload = Array.isArray(payload?.dependents) ? payload.dependents : null;

      return {
        ...base,
        subjectType: 'employee' as const,
        name: emp.name,
        cpf: (payload?.cpf as string) ?? emp.cpf,
        rg: (payload?.rg as string) ?? emp.rg,
        email: (payload?.email as string) ?? emp.email,
        phone: (payload?.phone as string) ?? emp.phone,
        birthDate:
          (payload?.birthDate as string) ??
          emp.birthDate?.toISOString().slice(0, 10) ??
          null,
        address:
          preferPayload && payload?.address
            ? payload.address
            : (emp.address ?? {}),
        pisNumber: (payload?.pisNumber as string) ?? emp.pisNumber,
        voterTitle: (payload?.voterTitle as string) ?? emp.voterTitle,
        ctpsUrl: (payload?.ctpsUrl as string) ?? emp.ctpsUrl,
        pixKey: (payload?.pixKey as string) ?? emp.pixKey,
        photoUrl: (payload?.photoUrl as string) ?? emp.photoUrl,
        admissionMedicalExamDate:
          (payload?.admissionMedicalExamDate as string) ??
          emp.admissionMedicalExamDate?.toISOString().slice(0, 10) ??
          null,
        admissionMedicalExamFileUrl:
          (payload?.admissionMedicalExamFileUrl as string) ?? emp.admissionMedicalExamFileUrl,
        dismissalMedicalExamDate:
          (payload?.dismissalMedicalExamDate as string) ??
          emp.dismissalMedicalExamDate?.toISOString().slice(0, 10) ??
          null,
        dismissalMedicalExamFileUrl:
          (payload?.dismissalMedicalExamFileUrl as string) ?? emp.dismissalMedicalExamFileUrl,
        hasMinorChildren:
          typeof payload?.hasMinorChildren === 'boolean'
            ? payload.hasMinorChildren
            : emp.hasMinorChildren,
        dependents:
          preferPayload && dependentsPayload ? dependentsPayload : dependentsFromDb,
        notes: (payload?.notes as string) ?? emp.notes,
      };
    }

    return null;
  }

  async submitPlayer(token: string, dto: SubmitPlayerRegistrationDto) {
    const invite = await this.requireSubmittableInvite(token);
    if (invite.subjectType !== 'player' || !invite.playerId) {
      throw new BadRequestException('Convite inválido para atleta');
    }

    await this.prisma.registrationInvite.update({
      where: { id: invite.id },
      data: {
        reviewStatus: 'pending',
        submittedAt: new Date(),
        submittedPayload: dto as unknown as Prisma.InputJsonValue,
        submittedDocuments: (dto.documents ?? []) as unknown as Prisma.InputJsonValue,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });

    return { ok: true, pending: true };
  }

  async submitEmployee(token: string, dto: SubmitEmployeeRegistrationDto) {
    const invite = await this.requireSubmittableInvite(token);
    if (invite.subjectType !== 'employee' || !invite.employeeId) {
      throw new BadRequestException('Convite inválido para colaborador');
    }

    await this.prisma.registrationInvite.update({
      where: { id: invite.id },
      data: {
        reviewStatus: 'pending',
        submittedAt: new Date(),
        submittedPayload: dto as unknown as Prisma.InputJsonValue,
        submittedDocuments: (dto.documents ?? []) as unknown as Prisma.InputJsonValue,
        rejectionReason: null,
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });

    return { ok: true, pending: true };
  }

  async listPendingReviews(tenantId?: string) {
    return this.prisma.registrationInvite.findMany({
      where: {
        reviewStatus: 'pending',
        ...(tenantId?.trim() ? { tenantId: tenantId.trim() } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true } },
        player: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getReviewDetail(id: string) {
    const invite = await this.prisma.registrationInvite.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true } },
        player: { select: { id: true, name: true, contactEmail: true, contactPhone: true } },
        employee: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!invite) throw new NotFoundException('Solicitação não encontrada');
    return invite;
  }

  async approveReview(id: string, userId?: string) {
    const invite = await this.prisma.registrationInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Solicitação não encontrada');
    if (invite.reviewStatus !== 'pending') {
      throw new BadRequestException('Esta solicitação não está pendente');
    }
    if (!invite.submittedPayload) {
      throw new BadRequestException('Solicitação sem dados enviados');
    }

    const documents = this.parseDocuments(invite.submittedDocuments);

    if (invite.subjectType === 'player' && invite.playerId) {
      await this.applyPlayerPayload(
        invite.playerId,
        invite.submittedPayload as SubmitPlayerRegistrationDto,
        documents,
      );
    } else if (invite.subjectType === 'employee' && invite.employeeId) {
      await this.applyEmployeePayload(
        invite.employeeId,
        invite.submittedPayload as SubmitEmployeeRegistrationDto,
        documents,
      );
    } else {
      throw new BadRequestException('Convite sem vínculo válido');
    }

    await this.prisma.registrationInvite.update({
      where: { id },
      data: {
        reviewStatus: 'approved',
        completedAt: new Date(),
        reviewedAt: new Date(),
        reviewedByUserId: userId ?? null,
      },
    });

    return { ok: true };
  }

  async rejectReview(id: string, dto: RejectRegistrationDto, userId?: string) {
    const invite = await this.prisma.registrationInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Solicitação não encontrada');
    if (invite.reviewStatus !== 'pending') {
      throw new BadRequestException('Esta solicitação não está pendente');
    }

    await this.prisma.registrationInvite.update({
      where: { id },
      data: {
        reviewStatus: 'rejected',
        rejectionReason: dto.reason?.trim() || 'Cadastro recusado. Verifique os dados e envie novamente.',
        reviewedAt: new Date(),
        reviewedByUserId: userId ?? null,
      },
    });

    return { ok: true };
  }

  private parseDocuments(raw: unknown): SubmittedDocumentDto[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (d): d is SubmittedDocumentDto =>
        !!d &&
        typeof d === 'object' &&
        typeof (d as SubmittedDocumentDto).fileUrl === 'string',
    );
  }

  private async applyPlayerPayload(
    playerId: string,
    dto: SubmitPlayerRegistrationDto,
    documents: SubmittedDocumentDto[],
  ) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { registrationProfile: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');

    const profile = mergeJson<Record<string, unknown>>(player.registrationProfile, {});
    if (dto.personal) {
      profile.personal = mergeJson(
        profile.personal,
        dto.personal as Record<string, unknown>,
      );
    }
    if (dto.address) {
      const addressBlock = mergeJson<Record<string, unknown>>(profile.address, {});
      if (dto.address.main) {
        addressBlock.main = mergeJson(
          addressBlock.main,
          dto.address.main as Record<string, unknown>,
        );
      }
      profile.address = addressBlock;
    }

    if (documents.length > 0) {
      const existing = Array.isArray(profile.documents) ? profile.documents : [];
      profile.documents = [...existing, ...documents];
    }

    const sports = mergeJson<Record<string, unknown>>(profile.sports, {});
    sports.documentationApprovedAt = new Date().toISOString();
    profile.sports = sports;

    await this.prisma.player.update({
      where: { id: playerId },
      data: {
        birthDate: dto.birthDate?.trim() || undefined,
        nationality: dto.nationality?.trim() || undefined,
        contactEmail: dto.contactEmail?.trim() || undefined,
        contactPhone: dto.contactPhone?.trim() || undefined,
        emergencyContactName: dto.emergencyContactName?.trim() || undefined,
        emergencyContactEmail: dto.emergencyContactEmail?.trim() || undefined,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() || undefined,
        registrationProfile: profile as Prisma.InputJsonValue,
      },
    });
  }

  private async applyEmployeePayload(
    employeeId: string,
    dto: SubmitEmployeeRegistrationDto,
    documents: SubmittedDocumentDto[],
  ) {
    const birthDate = dto.birthDate?.trim()
      ? new Date(`${dto.birthDate.trim()}T12:00:00.000Z`)
      : undefined;

    const docPatch = employeeDocumentationPatch({
      address: dto.address as EmployeeAddressDto | undefined,
      pisNumber: dto.pisNumber,
      voterTitle: dto.voterTitle,
      ctpsUrl: dto.ctpsUrl,
      pixKey: dto.pixKey,
      admissionMedicalExamDate: dto.admissionMedicalExamDate,
      admissionMedicalExamFileUrl: dto.admissionMedicalExamFileUrl,
      dismissalMedicalExamDate: dto.dismissalMedicalExamDate,
      dismissalMedicalExamFileUrl: dto.dismissalMedicalExamFileUrl,
      hasMinorChildren: dto.hasMinorChildren,
    });

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        cpf: dto.cpf?.trim() || undefined,
        rg: dto.rg?.trim() || undefined,
        email: dto.email?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        birthDate,
        photoUrl: dto.photoUrl?.trim() || undefined,
        notes: dto.notes?.trim() || undefined,
        ...docPatch,
      },
    });

    await this.prisma.employeeDependent.deleteMany({ where: { employeeId } });
    if (dto.hasMinorChildren && dto.dependents?.length) {
      await Promise.all(
        dto.dependents.map((dep) =>
          this.prisma.employeeDependent.create({
            data: {
              employeeId,
              name: normalizeDependentName(dep.name),
              birthDate: new Date(`${dep.birthDate.trim()}T12:00:00.000Z`),
              birthCertificateFileUrl: dep.birthCertificateFileUrl?.trim() || null,
              schoolAttendanceFileUrl: dep.schoolAttendanceFileUrl?.trim() || null,
              vaccinationCardFileUrl: dep.vaccinationCardFileUrl?.trim() || null,
            },
          }),
        ),
      );
    }

    for (const doc of documents) {
      await this.prisma.employeeDocument.create({
        data: {
          employeeId,
          documentType: employeeDocType(doc.documentType),
          fileKey: doc.fileKey ?? null,
          fileUrl: doc.fileUrl,
          notes: doc.name?.trim() || null,
        },
      });
    }
  }

  private async requireSubmittableInvite(token: string) {
    const invite = await this.prisma.registrationInvite.findUnique({
      where: { token: token.trim() },
    });
    if (!invite) throw new NotFoundException('Link inválido');
    if (isExpired(invite)) throw new BadRequestException('Link expirado');
    if (invite.reviewStatus === 'pending') {
      throw new BadRequestException('Cadastro já enviado e aguardando aprovação');
    }
    if (invite.reviewStatus === 'approved') {
      throw new BadRequestException('Este cadastro já foi aprovado');
    }
    return invite;
  }
}

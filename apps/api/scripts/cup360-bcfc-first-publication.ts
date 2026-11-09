/**
 * PROMPT 016 — primeira publicação BCFC via fluxo nativo CUP360 (produção).
 * Uso no servidor:
 *   cd apps/api && pnpm exec ts-node -r tsconfig-paths/register scripts/cup360-bcfc-first-publication.ts
 *
 * Flags:
 *   --preflight-only        só lê tenant/página/domínios existentes e sai
 *   --ownership-txt-only        grava TXT de ownership do registro www existente e para (PROMPT 019)
 *   --resume-after-ownership-txt  lê TXT publicado no Route53, verify nativo sem rotacionar challenge (PROMPT 021+)
 *   --max-retries=N               tentativas de publish/retry (default 40, intervalo 90s)
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PublicDomainService } from '../src/public-domain/public-domain.service';
import { PagesService } from '../src/pages/pages.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ChangeResourceRecordSetsCommand, ListResourceRecordSetsCommand } from '@aws-sdk/client-route-53';
import { hashVerificationToken, verificationTxtRecordName } from '../src/public-domain/public-domain.hostname.util';
import { loadPublicDomainAwsConfig } from '../src/public-domain/public-domain-aws.config';
import { createPublicDomainAwsClients } from '../src/public-domain/public-domain-aws.clients';
import { isCup360ManagedWebRecord } from '../src/public-domain/aws-route53-record-safety.util';
import type { CognitoJwtPayload } from '../src/auth/jwt-auth.guard';

/** Domínio bostoncityfc.com → tenant USA (não confundir com boston-city-fc-brasil). */
const TENANT_SLUG = 'boston-city-fc-usa';
const TENANT_SLUG_ALT = 'boston-city-fc-brasil';
const PORTFOLIO_SLUG = 'main';
const CANONICAL_HOST = 'www.bostoncityfc.com';
const APEX_HOST = 'bostoncityfc.com';
const BCFC_ZONE_ID = 'Z0293263107R5329WZZM8';

function dnsFqdn(name: string): string {
  return name.endsWith('.') ? name : `${name}.`;
}

function parseArgs() {
  const preflightOnly = process.argv.includes('--preflight-only');
  const ownershipTxtOnly = process.argv.includes('--ownership-txt-only');
  const resumeAfterOwnershipTxt = process.argv.includes('--resume-after-ownership-txt');
  const maxRetries = Number(
    process.argv.find((a) => a.startsWith('--max-retries='))?.split('=')[1] ?? '40',
  );
  return { preflightOnly, ownershipTxtOnly, resumeAfterOwnershipTxt, maxRetries };
}

async function resolveSuperAdminActor(prisma: PrismaService): Promise<CognitoJwtPayload> {
  const u =
    (await prisma.user.findFirst({
      where: { role: 'super_admin' },
      select: { id: true, cognitoSub: true, email: true, role: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: 'company_admin' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, cognitoSub: true, email: true, role: true },
    }));
  if (!u) throw new Error('Nenhum super_admin/company_admin encontrado.');
  const sub = u.cognitoSub?.trim() || u.id;
  return {
    sub,
    email: u.email ?? undefined,
    role: u.role ?? 'super_admin',
  };
}

async function resolveTenant(prisma: PrismaService) {
  let t = await prisma.tenant.findFirst({
    where: { slug: TENANT_SLUG },
    include: {
      mainPublicPage: { select: { id: true, slug: true, title: true } },
    },
  });
  if (!t) {
    t = await prisma.tenant.findFirst({
      where: { slug: TENANT_SLUG_ALT },
      include: {
        mainPublicPage: { select: { id: true, slug: true, title: true } },
      },
    });
  }
  if (!t) throw new Error(`Tenant ${TENANT_SLUG} não encontrado.`);
  return t;
}

async function ensureMainPage(
  prisma: PrismaService,
  pages: PagesService,
  tenantId: string,
  actor: CognitoJwtPayload,
  currentMainId: string | null,
): Promise<{ pageId: string; slug: string }> {
  if (currentMainId) {
    const linked = await prisma.page.findFirst({
      where: { id: currentMainId, tenantId },
      select: { id: true, slug: true },
    });
    if (linked) return { pageId: linked.id, slug: linked.slug };
  }
  const page = await prisma.page.findFirst({
    where: { tenantId, slug: PORTFOLIO_SLUG },
    select: { id: true, slug: true },
  });
  if (!page) {
    throw new Error(`Página principal não definida (mainPublicPageId vazio e slug=${PORTFOLIO_SLUG}).`);
  }
  if (currentMainId !== page.id) {
    await pages.setMainPublicPageForTenant(tenantId, page.id, actor);
  }
  return { pageId: page.id, slug: page.slug };
}

async function upsertOwnershipTxt(
  zoneId: string,
  recordName: string,
  txtValue: string,
  zoneName: string,
): Promise<void> {
  const cfg = loadPublicDomainAwsConfig();
  if (!cfg.enabled || !cfg.route53ManageDns) {
    throw new Error('Route53 gerenciado desabilitado — não é possível gravar TXT de verificação.');
  }
  const { r53 } = createPublicDomainAwsClients(cfg);
  const name = dnsFqdn(recordName);
  if (!isCup360ManagedWebRecord(name, 'TXT', zoneName)) {
    throw new Error(`TXT de verificação bloqueado pela política de segurança: ${recordName}`);
  }
  await r53.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: zoneId,
      ChangeBatch: {
        Comment: 'CUP360 ownership verification TXT',
        Changes: [
          {
            Action: 'UPSERT',
            ResourceRecordSet: {
              Name: name,
              Type: 'TXT',
              TTL: 300,
              ResourceRecords: [{ Value: `"${txtValue}"` }],
            },
          },
        ],
      },
    }),
  );
}

function extractVerifyToken(txtValue?: string): string | null {
  if (!txtValue) return null;
  const stripped = txtValue.trim().replace(/^"|"$/g, '');
  const m = /^cup360-verify=(.+)$/.exec(stripped);
  return m?.[1] ?? null;
}

async function readPublishedOwnershipToken(
  hostnameNormalized: string,
  expectedHash: string | null,
): Promise<string> {
  const cfg = loadPublicDomainAwsConfig();
  const { r53 } = createPublicDomainAwsClients(cfg);
  const recordName = dnsFqdn(verificationTxtRecordName(hostnameNormalized));
  const out = await r53.send(
    new ListResourceRecordSetsCommand({
      HostedZoneId: BCFC_ZONE_ID,
      StartRecordName: recordName,
      StartRecordType: 'TXT',
      MaxItems: 1,
    }),
  );
  const set = (out.ResourceRecordSets ?? []).find(
    (r) => r.Type === 'TXT' && r.Name?.toLowerCase() === recordName.toLowerCase(),
  );
  if (!set?.ResourceRecords?.length) {
    throw new Error(`TXT de ownership não encontrado no Route53: ${verificationTxtRecordName(hostnameNormalized)}`);
  }
  const raw = set.ResourceRecords.map((r) => r.Value ?? '').join(' ');
  const token = extractVerifyToken(raw);
  if (!token) throw new Error('TXT publicado sem prefixo cup360-verify=');
  if (expectedHash && hashVerificationToken(token) !== expectedHash) {
    throw new Error('Hash do challenge no banco não corresponde ao TXT publicado (não rotacionar).');
  }
  return token;
}

async function ensureDomain(
  svc: PublicDomainService,
  tenantId: string,
  hostname: string,
  isCanonical: boolean,
  actor: CognitoJwtPayload,
) {
  return svc.create(tenantId, { hostname, isCanonical }, actor);
}

async function verifyDomainWithTxt(
  svc: PublicDomainService,
  tenantId: string,
  domainId: string,
  dto: { verificationTxtName?: string; verificationTxtValue?: string },
  actor: CognitoJwtPayload,
  zoneName: string,
) {
  const token = extractVerifyToken(dto.verificationTxtValue);
  if (!token || !dto.verificationTxtName) throw new Error('TXT de verificação ausente no create.');
  await upsertOwnershipTxt(BCFC_ZONE_ID, dto.verificationTxtName, `cup360-verify=${token}`, zoneName);
  await new Promise((r) => setTimeout(r, 5000));
  return svc.verifyOwnershipWithToken(tenantId, domainId, { token }, actor);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { preflightOnly, ownershipTxtOnly, resumeAfterOwnershipTxt, maxRetries } = parseArgs();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const publicDomain = app.get(PublicDomainService);
  const pages = app.get(PagesService);
  const actor = await resolveSuperAdminActor(prisma);
  const tenant = await resolveTenant(prisma);

  const main = await ensureMainPage(prisma, pages, tenant.id, actor, tenant.mainPublicPageId);

  const existing = await publicDomain.list(tenant.id, actor);
  const snapshot = {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    mainPublicPageId: main.pageId,
    mainPageSlug: main.slug,
    existingDomains: existing,
  };
  console.log(JSON.stringify({ phase: 'preflight', ...snapshot }, null, 2));

  if (preflightOnly) {
    await app.close();
    return;
  }

  const zoneName = `${APEX_HOST}.`;

  let wwwDto = existing.find((d) => d.hostnameNormalized === CANONICAL_HOST);
  if (!wwwDto) {
    throw new Error(
      `PublicDomain ${CANONICAL_HOST} não encontrado — use o registro existente (não criar duplicata).`,
    );
  }
  if (wwwDto.verificationStatus !== 'VERIFIED') {
    if (ownershipTxtOnly) {
      const refresh =
        wwwDto.verificationTxtValue == null
          ? await publicDomain.refreshVerificationChallenge(tenant.id, wwwDto.id, actor)
          : wwwDto;
      if (!refresh.verificationTxtName || !refresh.verificationTxtValue) {
        throw new Error('Challenge TXT ausente após refresh.');
      }
      await upsertOwnershipTxt(
        BCFC_ZONE_ID,
        refresh.verificationTxtName,
        refresh.verificationTxtValue,
        zoneName,
      );
      console.log(
        JSON.stringify({
          phase: 'ownership_txt_upsert',
          domainId: wwwDto.id,
          txtName: refresh.verificationTxtName,
          hostedZoneId: BCFC_ZONE_ID,
        }),
      );
      await app.close();
      return;
    }
    if (resumeAfterOwnershipTxt) {
      const row = await prisma.publicDomain.findUniqueOrThrow({
        where: { id: wwwDto.id },
        select: { verificationTokenHash: true },
      });
      const token = await readPublishedOwnershipToken(
        CANONICAL_HOST,
        row.verificationTokenHash,
      );
      console.log(
        JSON.stringify({
          phase: 'ownership_txt_match',
          domainId: wwwDto.id,
          txtName: verificationTxtRecordName(CANONICAL_HOST),
          hashMatchesPublishedTxt: true,
        }),
      );
      wwwDto = await publicDomain.verifyOwnershipWithToken(tenant.id, wwwDto.id, { token }, actor);
    } else {
      const refresh =
        wwwDto.verificationTxtValue == null
          ? await publicDomain.refreshVerificationChallenge(tenant.id, wwwDto.id, actor)
          : wwwDto;
      wwwDto = await verifyDomainWithTxt(
        publicDomain,
        tenant.id,
        wwwDto.id,
        refresh,
        actor,
        zoneName,
      );
    }
  }

  let apexDto = existing.find((d) => d.hostnameNormalized === APEX_HOST);
  if (!apexDto) {
    apexDto = await ensureDomain(publicDomain, tenant.id, APEX_HOST, false, actor);
  }
  if (apexDto.verificationStatus !== 'VERIFIED') {
    if (resumeAfterOwnershipTxt) {
      const row = await prisma.publicDomain.findUniqueOrThrow({
        where: { id: apexDto.id },
        select: { verificationTokenHash: true },
      });
      try {
        const token = await readPublishedOwnershipToken(APEX_HOST, row.verificationTokenHash);
        console.log(
          JSON.stringify({
            phase: 'ownership_txt_match',
            domainId: apexDto.id,
            txtName: verificationTxtRecordName(APEX_HOST),
            hashMatchesPublishedTxt: true,
          }),
        );
        apexDto = await publicDomain.verifyOwnershipWithToken(tenant.id, apexDto.id, { token }, actor);
      } catch (readErr) {
        const msg = readErr instanceof Error ? readErr.message : String(readErr);
        if (!msg.includes('não encontrado')) throw readErr;
        // Apex criado após TXT manual do www — publica ownership TXT via IAM (mesmo fluxo nativo do create).
        const refresh =
          apexDto.verificationTxtValue == null
            ? await publicDomain.refreshVerificationChallenge(tenant.id, apexDto.id, actor)
            : apexDto;
        if (!refresh.verificationTxtName || !refresh.verificationTxtValue) {
          throw new Error('Challenge TXT ausente para apex após refresh.');
        }
        console.log(
          JSON.stringify({
            phase: 'ownership_txt_upsert',
            domainId: apexDto.id,
            txtName: refresh.verificationTxtName,
            hostedZoneId: BCFC_ZONE_ID,
          }),
        );
        apexDto = await verifyDomainWithTxt(
          publicDomain,
          tenant.id,
          apexDto.id,
          refresh,
          actor,
          zoneName,
        );
      }
    } else {
      const refresh =
        apexDto.verificationTxtValue == null
          ? await publicDomain.refreshVerificationChallenge(tenant.id, apexDto.id, actor)
          : apexDto;
      apexDto = await verifyDomainWithTxt(
        publicDomain,
        tenant.id,
        apexDto.id,
        refresh,
        actor,
        zoneName,
      );
    }
  }

  wwwDto = await publicDomain.setCanonical(tenant.id, wwwDto.id, actor);

  let last = wwwDto;
  for (let i = 0; i < maxRetries; i++) {
    last =
      last.provisioningStatus === 'ACTIVE' && last.status === 'ACTIVE'
        ? last
        : await publicDomain.publish(tenant.id, wwwDto.id, actor);
    console.log(
      JSON.stringify({
        phase: 'publish_retry',
        attempt: i + 1,
        provisioningStatus: last.provisioningStatus,
        provisioningStep: last.provisioningStep,
        sslStatus: last.sslStatus,
        distributionId: last.distributionId,
        lastErrorCode: last.lastErrorCode,
      }),
    );
    if (last.provisioningStatus === 'ACTIVE') break;
    if (last.provisioningStatus === 'ERROR') break;
    await sleep(90_000);
    last = await publicDomain.retry(tenant.id, wwwDto.id, actor);
  }

  console.log(JSON.stringify({ phase: 'final', last }, null, 2));
  await app.close();
  if (last.provisioningStatus !== 'ACTIVE') process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

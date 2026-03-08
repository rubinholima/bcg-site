import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

const HELLOSIGN_BASE = 'https://api.hellosign.com/v3';

export interface SignatureFieldPosition {
  page?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SendForSignatureParams {
  fileBuffer: Buffer;
  fileName: string;
  agreementName: string;
  signerEmail: string;
  signerName?: string;
  message?: string;
  /** Posição do campo de assinatura (padrão: rodapé da página 1). Coordenadas 72 DPI, página A4 ~612x792. */
  signatureField?: SignatureFieldPosition;
}

export interface HelloSignResult {
  signatureRequestId: string;
  signingUrl?: string;
  status: string;
}

@Injectable()
export class HelloSignService {
  private readonly logger = new Logger(HelloSignService.name);

  private getAuthHeader(): string {
    const apiKey = process.env.HELLOSIGN_API_KEY?.trim();
    if (!apiKey) {
      throw new InternalServerErrorException(
        'HelloSign não configurado. Defina HELLOSIGN_API_KEY.',
      );
    }
    const encoded = Buffer.from(`${apiKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Envia documento para assinatura via HelloSign (Dropbox Sign).
   */
  async sendForSignature(params: SendForSignatureParams): Promise<HelloSignResult> {
    const formData = new FormData();
    formData.append('files[0]', new Blob([new Uint8Array(params.fileBuffer)], { type: 'application/pdf' }), params.fileName);
    formData.append('signers[0][email_address]', params.signerEmail);
    formData.append('signers[0][name]', params.signerName ?? params.signerEmail.split('@')[0]);
    formData.append('title', params.agreementName);
    formData.append('subject', 'Por favor, assine este documento');
    formData.append('message', params.message ?? 'Por favor, assine o documento anexo.');

    const sig = params.signatureField ?? {};
    const page = sig.page ?? 1;
    const x = Math.max(0, Math.min(612, sig.x ?? 50));
    const y = Math.max(0, Math.min(600, sig.y ?? 600)); // HelloSign: y deve ser < 682
    const width = Math.max(100, Math.min(400, sig.width ?? 250));
    const height = Math.max(30, Math.min(80, sig.height ?? 40));

    const formFields = [
      [
        {
          api_id: 'signature_player',
          type: 'signature',
          x,
          y,
          width,
          height,
          page,
          signer: 0,
          required: true,
        },
      ],
    ];
    formData.append('form_fields_per_document', JSON.stringify(formFields));

    const testMode = process.env.HELLOSIGN_TEST_MODE === 'true';
    if (testMode) {
      formData.append('test_mode', '1');
    }

    const res = await fetch(`${HELLOSIGN_BASE}/signature_request/send`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternalServerErrorException(
        `Falha ao enviar documento para HelloSign: ${res.status} ${text}`,
      );
    }

    const data = (await res.json()) as {
      signature_request?: {
        signature_request_id: string;
        status: string;
        signatures?: Array<{ sign_url?: string }>;
      };
    };

    const sr = data.signature_request;
    if (!sr) {
      throw new InternalServerErrorException('Resposta inválida do HelloSign.');
    }

    const signingUrl = sr.signatures?.[0]?.sign_url;

    return {
      signatureRequestId: sr.signature_request_id,
      signingUrl,
      status: sr.status ?? 'awaiting_signature',
    };
  }

  /**
   * Obtém o status atual da signature request.
   */
  async getSignatureRequestStatus(signatureRequestId: string): Promise<{ status: string }> {
    const testMode = process.env.HELLOSIGN_TEST_MODE === 'true';
    const url = new URL(`${HELLOSIGN_BASE}/signature_request/${signatureRequestId}`);
    if (testMode) url.searchParams.set('test_mode', '1');
    this.logger.log(`HelloSign GET status: ${url.toString().replace(/key=[^&]+/, 'key=***')}`);
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.getAuthHeader() },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternalServerErrorException(
        `Falha ao obter status HelloSign: ${res.status} ${text}`,
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    this.logger.log(
      `HelloSign getStatus response (truncated): ${JSON.stringify(data).slice(0, 600)}`,
    );
    const sr = data.signature_request as Record<string, unknown> | undefined;
    const nested = sr?.signature_request as Record<string, unknown> | undefined;
    let status =
      (sr?.status as string) ??
      (nested?.status as string) ??
      (data.status as string) ??
      '';

    if (!status && Array.isArray(sr?.signatures)) {
      const sigs = sr.signatures as Array<Record<string, unknown>>;
      const allHaveSignedAt = sigs.every((s) => s.signed_at != null && s.signed_at !== '');
      const allSignedByCode = sigs.every(
        (s) =>
          s.status_code === 2 ||
          s.status_code === 'signed' ||
          (typeof s.status_code === 'string' && s.status_code.toLowerCase() === 'signed'),
      );
      if ((allHaveSignedAt || allSignedByCode) && sigs.length > 0) status = 'signed';
    }

    if (!status) status = 'unknown';
    return { status: String(status) };
  }

  /**
   * Download do documento assinado (PDF).
   */
  async getSignedDocument(signatureRequestId: string): Promise<Buffer> {
    const testMode = process.env.HELLOSIGN_TEST_MODE === 'true';
    const url = new URL(
      `${HELLOSIGN_BASE}/signature_request/files/${signatureRequestId}`,
    );
    url.searchParams.set('file_type', 'pdf');
    if (testMode) url.searchParams.set('test_mode', '1');
    const res = await fetch(url.toString(), {
      headers: { Authorization: this.getAuthHeader() },
    });

    if (!res.ok) {
      if (res.status === 409) {
        throw new InternalServerErrorException(
          'Documento ainda sendo processado. Tente novamente em alguns segundos.',
        );
      }
      const text = await res.text();
      throw new InternalServerErrorException(
        `Falha ao baixar documento: ${res.status} ${text}`,
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Verifica se HelloSign está configurado. */
  isConfigured(): boolean {
    return !!process.env.HELLOSIGN_API_KEY?.trim();
  }
}

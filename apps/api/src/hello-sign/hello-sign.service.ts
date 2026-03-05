import { Injectable, InternalServerErrorException } from '@nestjs/common';

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
    const x = sig.x ?? 50;
    const y = sig.y ?? 720;
    const width = sig.width ?? 250;
    const height = sig.height ?? 40;

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
    const res = await fetch(`${HELLOSIGN_BASE}/signature_request/${signatureRequestId}`, {
      headers: { Authorization: this.getAuthHeader() },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternalServerErrorException(
        `Falha ao obter status HelloSign: ${res.status} ${text}`,
      );
    }

    const data = (await res.json()) as { signature_request?: { status: string } };
    const status = data.signature_request?.status ?? 'unknown';
    return { status };
  }

  /**
   * Download do documento assinado (PDF).
   */
  async getSignedDocument(signatureRequestId: string): Promise<Buffer> {
    const res = await fetch(
      `${HELLOSIGN_BASE}/signature_request/files/${signatureRequestId}?file_type=pdf`,
      { headers: { Authorization: this.getAuthHeader() } },
    );

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

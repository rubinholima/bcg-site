import { BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

export async function getPdfPageCount(buffer: Buffer): Promise<number | undefined> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch {
    return undefined;
  }
}

export async function listPdfFormFieldNames(buffer: Buffer): Promise<string[]> {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    return fields.map((f) => f.getName()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function fillPdfFormFields(
  buffer: Buffer,
  values: Record<string, string>,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  let filled = 0;

  for (const [fieldName, text] of Object.entries(values)) {
    if (!text?.trim()) continue;
    try {
      const field = form.getTextField(fieldName);
      field.setText(text.trim());
      filled += 1;
    } catch {
      try {
        const field = form.getDropdown(fieldName);
        field.select(text.trim());
        filled += 1;
      } catch {
        // campo inexistente ou tipo não suportado
      }
    }
  }

  if (filled === 0 && Object.keys(values).length > 0) {
    throw new BadRequestException(
      'Nenhum campo do PDF foi preenchido. Verifique se o modelo tem campos AcroForm nomeados e o mapeamento no Jurídico.',
    );
  }

  try {
    form.updateFieldAppearances();
  } catch {
    // alguns PDFs não suportam
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

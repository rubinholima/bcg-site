import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

export type PhysioGameProcedureItem = {
  procedureKey: string;
  procedureLabel?: string | null;
};

export type PhysioGameBodyLocationItem = {
  bodyLocation: string;
  bodyLocationLabel?: string | null;
};

type LegacyGameAttendanceRow = {
  procedureKey: string;
  procedureLabel?: string | null;
  bodyLocation: string;
  bodyLocationLabel?: string | null;
  procedures?: unknown;
  bodyLocations?: unknown;
};

function readProcedureItem(raw: unknown): PhysioGameProcedureItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const procedureKey = typeof row.procedureKey === 'string' ? row.procedureKey.trim() : '';
  if (!procedureKey) return null;
  const procedureLabel =
    typeof row.procedureLabel === 'string' ? row.procedureLabel.trim() || null : null;
  return { procedureKey, procedureLabel };
}

function readBodyLocationItem(raw: unknown): PhysioGameBodyLocationItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const bodyLocation = typeof row.bodyLocation === 'string' ? row.bodyLocation.trim() : '';
  if (!bodyLocation) return null;
  const bodyLocationLabel =
    typeof row.bodyLocationLabel === 'string' ? row.bodyLocationLabel.trim() || null : null;
  return { bodyLocation, bodyLocationLabel };
}

export function parseGameProceduresFromRow(row: LegacyGameAttendanceRow): PhysioGameProcedureItem[] {
  if (Array.isArray(row.procedures)) {
    const parsed = row.procedures.map(readProcedureItem).filter(Boolean) as PhysioGameProcedureItem[];
    if (parsed.length > 0) return parsed;
  }
  return [
    {
      procedureKey: row.procedureKey,
      procedureLabel: row.procedureLabel ?? null,
    },
  ];
}

export function parseGameBodyLocationsFromRow(
  row: LegacyGameAttendanceRow,
): PhysioGameBodyLocationItem[] {
  if (Array.isArray(row.bodyLocations)) {
    const parsed = row.bodyLocations
      .map(readBodyLocationItem)
      .filter(Boolean) as PhysioGameBodyLocationItem[];
    if (parsed.length > 0) return parsed;
  }
  return [
    {
      bodyLocation: row.bodyLocation,
      bodyLocationLabel: row.bodyLocationLabel ?? null,
    },
  ];
}

export function enrichGameAttendanceRow<T extends LegacyGameAttendanceRow>(row: T) {
  const procedures = parseGameProceduresFromRow(row);
  const bodyLocations = parseGameBodyLocationsFromRow(row);
  const firstProcedure = procedures[0]!;
  const firstLocation = bodyLocations[0]!;
  return {
    ...row,
    procedures,
    bodyLocations,
    procedureKey: firstProcedure.procedureKey,
    procedureLabel: firstProcedure.procedureLabel ?? null,
    bodyLocation: firstLocation.bodyLocation,
    bodyLocationLabel: firstLocation.bodyLocationLabel ?? null,
  };
}

export function validateGameProcedureItems(items: PhysioGameProcedureItem[]) {
  if (items.length === 0) {
    throw new BadRequestException('Informe ao menos um procedimento.');
  }
  for (const item of items) {
    if (!item.procedureKey?.trim()) {
      throw new BadRequestException('Procedimento inválido.');
    }
    if (item.procedureKey === 'outro' && !item.procedureLabel?.trim()) {
      throw new BadRequestException('Descreva o procedimento quando selecionar Outro.');
    }
  }
}

export function validateGameBodyLocationItems(items: PhysioGameBodyLocationItem[]) {
  if (items.length === 0) {
    throw new BadRequestException('Informe ao menos um local.');
  }
  for (const item of items) {
    if (!item.bodyLocation?.trim()) {
      throw new BadRequestException('Local inválido.');
    }
    if (item.bodyLocation === 'outro' && !item.bodyLocationLabel?.trim()) {
      throw new BadRequestException('Especifique o local quando selecionar Outro.');
    }
  }
}

export function resolveGameProceduresInput(input: {
  procedures?: PhysioGameProcedureItem[];
  procedureKey?: string;
  procedureLabel?: string | null;
}): PhysioGameProcedureItem[] {
  if (input.procedures?.length) {
    return input.procedures.map((item) => ({
      procedureKey: item.procedureKey.trim(),
      procedureLabel: item.procedureLabel?.trim() || null,
    }));
  }
  if (input.procedureKey?.trim()) {
    return [
      {
        procedureKey: input.procedureKey.trim(),
        procedureLabel: input.procedureLabel?.trim() || null,
      },
    ];
  }
  return [];
}

export function resolveGameBodyLocationsInput(input: {
  bodyLocations?: PhysioGameBodyLocationItem[];
  bodyLocation?: string;
  bodyLocationLabel?: string | null;
}): PhysioGameBodyLocationItem[] {
  if (input.bodyLocations?.length) {
    return input.bodyLocations.map((item) => ({
      bodyLocation: item.bodyLocation.trim(),
      bodyLocationLabel: item.bodyLocationLabel?.trim() || null,
    }));
  }
  if (input.bodyLocation?.trim()) {
    return [
      {
        bodyLocation: input.bodyLocation.trim(),
        bodyLocationLabel: input.bodyLocationLabel?.trim() || null,
      },
    ];
  }
  return [];
}

export function gameAttendanceItemsToJson(
  procedures: PhysioGameProcedureItem[],
  bodyLocations: PhysioGameBodyLocationItem[],
): {
  procedures: Prisma.InputJsonValue;
  bodyLocations: Prisma.InputJsonValue;
  procedureKey: string;
  procedureLabel: string | null;
  bodyLocation: string;
  bodyLocationLabel: string | null;
} {
  const firstProcedure = procedures[0]!;
  const firstLocation = bodyLocations[0]!;
  return {
    procedures: procedures as unknown as Prisma.InputJsonValue,
    bodyLocations: bodyLocations as unknown as Prisma.InputJsonValue,
    procedureKey: firstProcedure.procedureKey,
    procedureLabel: firstProcedure.procedureLabel ?? null,
    bodyLocation: firstLocation.bodyLocation,
    bodyLocationLabel: firstLocation.bodyLocationLabel ?? null,
  };
}

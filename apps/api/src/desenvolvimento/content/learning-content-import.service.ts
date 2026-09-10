import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { importLearningContentManifest } from './learning-content.importer';
import { loadLearningContentManifest } from './learning-content.registry';
import type {
  LearningContentImportResult,
  LearningContentManifest,
} from './learning-content.types';

@Injectable()
export class LearningContentImportService {
  constructor(private readonly prisma: PrismaService) {}

  importManifest(
    manifest: LearningContentManifest,
  ): Promise<LearningContentImportResult> {
    return importLearningContentManifest(this.prisma, manifest);
  }

  importManifestById(manifestId: string): Promise<LearningContentImportResult> {
    const manifest = loadLearningContentManifest(manifestId);
    return this.importManifest(manifest);
  }
}

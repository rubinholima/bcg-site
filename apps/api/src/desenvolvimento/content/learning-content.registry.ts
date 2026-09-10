import * as fs from 'fs';
import * as path from 'path';
import type { LearningContentManifest } from './learning-content.types';

export const LEARNING_CONTENT_MANIFEST_IDS = [
  'cup360-english-start-v1',
] as const;

export type LearningContentManifestId =
  (typeof LEARNING_CONTENT_MANIFEST_IDS)[number];

const MANIFESTS_DIR = path.join(__dirname, 'manifests');

export function resolveLearningContentManifestPath(manifestId: string): string {
  const filePath = path.join(MANIFESTS_DIR, `${manifestId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Manifest não encontrado: ${manifestId}`);
  }
  return filePath;
}

export function loadLearningContentManifest(
  manifestId: string,
): LearningContentManifest {
  const filePath = resolveLearningContentManifestPath(manifestId);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as LearningContentManifest;
}

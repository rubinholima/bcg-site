/**
 * Publica curso START oficial após import (preserva se já published).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();

const KEY = 'cup360-english-start-v1';
const existing = await p.learningCourse.findUnique({ where: { contentKey: KEY } });
if (!existing) {
  console.error('Curso não encontrado:', KEY);
  process.exit(1);
}

if (existing.status !== 'published') {
  await p.learningCourse.update({
    where: { id: existing.id },
    data: { status: 'published', publishedAt: existing.publishedAt ?? new Date() },
  });
  console.log('Curso publicado:', KEY);
} else {
  console.log('Curso já estava published:', KEY);
}

await p.$disconnect();
